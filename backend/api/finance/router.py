from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List

from api.dependencies import get_db, require_roles
from packages.db.models.fleet import Vehicle, Driver
from packages.db.models.ops import Trip, MaintenanceLog
from packages.db.models.finance import FuelLog, Expense
from api.finance.schemas import (
    FuelLogCreate, FuelLogResponse, FuelLogDetailResponse,
    ExpenseCreate, ExpenseResponse, ExpenseDetailResponse,
    RoiResponse, DashboardKPIs, CostBreakdown
)

router = APIRouter()

# Role constants
FINANCIAL_ANALYST_ONLY = ["Financial Analyst", "Admin"]
ALL_AUTHENTICATED = ["Fleet Manager", "Dispatcher", "Driver", "Safety Officer", "Financial Analyst", "Admin"]

# =====================================================================
# FUEL & EXPENSE REGISTER
# =====================================================================

@router.post("/fuel-logs", response_model=FuelLogResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_roles(FINANCIAL_ANALYST_ONLY))])
@router.post("/fuel", response_model=FuelLogResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_roles(FINANCIAL_ANALYST_ONLY))])
async def create_fuel_log(log_in: FuelLogCreate, db: AsyncSession = Depends(get_db)):
    """Creates a fuel log record associated with a vehicle (supports both /fuel and /fuel-logs)."""
    vehicle = await db.get(Vehicle, log_in.vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found.")
        
    db_log = FuelLog(**log_in.model_dump())
    db.add(db_log)
    await db.commit()
    await db.refresh(db_log)
    return db_log

@router.get("/fuel-logs", response_model=List[FuelLogDetailResponse], dependencies=[Depends(require_roles(ALL_AUTHENTICATED))])
async def list_fuel_logs(db: AsyncSession = Depends(get_db)):
    """Lists all fuel logs with vehicle names."""
    res = await db.exec(select(FuelLog).order_by(FuelLog.date.desc()))
    logs = res.all()
    result = []
    for log in logs:
        vehicle = await db.get(Vehicle, log.vehicle_id)
        result.append(FuelLogDetailResponse(
            id=log.id,
            vehicle_id=log.vehicle_id,
            vehicle_name=vehicle.name_model or vehicle.reg_no if vehicle else None,
            date=log.date,
            liters=log.liters,
            fuel_cost=log.fuel_cost,
            fuel_bill_url=log.fuel_bill_url,
        ))
    return result

@router.post("/expenses", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_roles(FINANCIAL_ANALYST_ONLY))])
async def create_expense(expense_in: ExpenseCreate, db: AsyncSession = Depends(get_db)):
    """Logs an expense record (tolls, maintenance, or other costs) for a vehicle."""
    vehicle = await db.get(Vehicle, expense_in.vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found.")
        
    # Auto-compute total cost if not explicitly passed
    computed_total = float(expense_in.toll) + float(expense_in.other)
    if expense_in.maint_id:
        maint = await db.get(MaintenanceLog, expense_in.maint_id)
        if maint:
            computed_total += float(maint.cost)
            
    total_val = expense_in.total_cost if expense_in.total_cost is not None else computed_total
    
    db_expense = Expense(**expense_in.model_dump(exclude={"total_cost"}), total_cost=total_val)
    db.add(db_expense)
    await db.commit()
    await db.refresh(db_expense)
    return db_expense

@router.get("/expenses", response_model=List[ExpenseDetailResponse], dependencies=[Depends(require_roles(ALL_AUTHENTICATED))])
async def list_expenses(db: AsyncSession = Depends(get_db)):
    """Lists all expenses with vehicle and trip names."""
    res = await db.exec(select(Expense))
    expenses = res.all()
    result = []
    for exp in expenses:
        vehicle = await db.get(Vehicle, exp.vehicle_id)
        trip_code = None
        if exp.trip_id:
            trip = await db.get(Trip, exp.trip_id)
            trip_code = trip.trip_code if trip else None
        result.append(ExpenseDetailResponse(
            id=exp.id,
            vehicle_id=exp.vehicle_id,
            vehicle_name=vehicle.name_model or vehicle.reg_no if vehicle else None,
            trip_id=exp.trip_id,
            trip_code=trip_code,
            toll=exp.toll,
            other=exp.other,
            total_cost=exp.total_cost,
            expense_bill_url=exp.expense_bill_url,
        ))
    return result

# =====================================================================
# RETURN ON INVESTMENT (ROI) CALCULATOR
# =====================================================================

@router.get("/roi/{vehicle_id}", response_model=RoiResponse, dependencies=[Depends(require_roles(ALL_AUTHENTICATED))])
async def calculate_vehicle_roi(vehicle_id: int, db: AsyncSession = Depends(get_db)):
    """Computes dynamic return on investment (ROI) metric for a target vehicle asset."""
    vehicle = await db.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found.")

    # 1. Total Fuel Cost
    fuel_cost_res = await db.exec(
        select(func.sum(FuelLog.fuel_cost)).where(FuelLog.vehicle_id == vehicle_id)
    )
    fuel_cost = float(fuel_cost_res.first() or 0.0)

    # 2. Total Maintenance Cost
    maint_cost_res = await db.exec(
        select(func.sum(MaintenanceLog.cost)).where(MaintenanceLog.vehicle_id == vehicle_id)
    )
    maint_cost = float(maint_cost_res.first() or 0.0)

    # 3. Total Trip Revenue
    # Revenue Formula: planned_distance * 12.5 + cargo_weight * 0.05 for each completed trip
    trips_res = await db.exec(
        select(Trip).where(Trip.vehicle_id == vehicle_id).where(Trip.status == "Completed")
    )
    completed_trips = trips_res.all()
    
    revenue = 0.0
    for trip in completed_trips:
        revenue += (trip.planned_dist * 12.5) + (trip.cargo_weight * 0.05)

    # 4. Acquisition Cost
    acq_cost = float(vehicle.acq_cost)

    # 5. ROI Formula
    # ROI = (Revenue - (Maintenance + Fuel)) / Acquisition Cost
    net_profit = revenue - (maint_cost + fuel_cost)
    roi_percentage = (net_profit / acq_cost * 100) if acq_cost > 0 else 0.0

    return RoiResponse(
        vehicle_id=vehicle_id,
        revenue=round(revenue, 2),
        maintenance_cost=round(maint_cost, 2),
        fuel_cost=round(fuel_cost, 2),
        acquisition_cost=round(acq_cost, 2),
        roi_percentage=round(roi_percentage, 2)
    )

# =====================================================================
# UNIFIED ANALYTICS COMPILER
# =====================================================================

@router.get("/dashboard/analytics", response_model=DashboardKPIs, dependencies=[Depends(require_roles(ALL_AUTHENTICATED))])
async def compile_dashboard_metrics(db: AsyncSession = Depends(get_db)):
    """Gathers and compiles all system operations statistics for backend views."""
    # 1. Gather baseline asset and operations operational status balances
    v_active_res = await db.exec(select(func.count(Vehicle.id)).where(Vehicle.status == "On Trip"))
    v_active = v_active_res.first() or 0
    v_avail_res = await db.exec(select(func.count(Vehicle.id)).where(Vehicle.status == "Available"))
    v_avail = v_avail_res.first() or 0
    v_shop_res = await db.exec(select(func.count(Vehicle.id)).where(Vehicle.status == "In Shop"))
    v_shop = v_shop_res.first() or 0
    
    t_active_res = await db.exec(select(func.count(Trip.id)).where(Trip.status == "Dispatched"))
    t_active = t_active_res.first() or 0
    t_pending_res = await db.exec(select(func.count(Trip.id)).where(Trip.status == "Draft"))
    t_pending = t_pending_res.first() or 0
    d_duty_res = await db.exec(select(func.count(Driver.id)).where(Driver.status == "On Trip"))
    d_duty = d_duty_res.first() or 0

    # 2. Fleet Utilization calculation processing
    total_vehicles = v_active + v_avail + v_shop
    util_pct = (v_active / total_vehicles * 100.0) if total_vehicles > 0 else 0.0

    # 3. Sum total running outlays
    total_fuel_res = await db.exec(select(func.sum(FuelLog.fuel_cost)))
    total_fuel = float(total_fuel_res.first() or 0.0)
    total_exp_res = await db.exec(select(func.sum(Expense.total_cost)))
    total_exp = float(total_exp_res.first() or 0.0)
    total_maint_res = await db.exec(select(func.sum(MaintenanceLog.cost)))
    total_maint = float(total_maint_res.first() or 0.0)
    agg_operational_cost = total_fuel + total_exp + total_maint

    # 4. Gather all vehicles for dynamic metrics
    vehicles_res = await db.exec(select(Vehicle))
    all_vehicles = vehicles_res.all()
    
    # Top costliest vehicles list calculation
    vehicle_costs = []
    roi_pcts = []
    for v in all_vehicles:
        # Cost aggregation
        v_fuel_res = await db.exec(select(func.sum(FuelLog.fuel_cost)).where(FuelLog.vehicle_id == v.id))
        v_fuel = float(v_fuel_res.first() or 0.0)
        v_maint_res = await db.exec(select(func.sum(MaintenanceLog.cost)).where(MaintenanceLog.vehicle_id == v.id))
        v_maint = float(v_maint_res.first() or 0.0)
        v_exp_res = await db.exec(select(func.sum(Expense.total_cost)).where(Expense.vehicle_id == v.id))
        v_exp = float(v_exp_res.first() or 0.0)
        v_total = v_fuel + v_maint + v_exp
        
        vehicle_costs.append(CostBreakdown(vehicle_name=v.name_model or v.reg_no, cost=round(v_total, 2)))
        
        # ROI aggregation
        v_trips_res = await db.exec(
            select(Trip).where(Trip.vehicle_id == v.id).where(Trip.status == "Completed")
        )
        v_trips = v_trips_res.all()
        v_rev = sum((t.planned_dist * 12.5) + (t.cargo_weight * 0.05) for t in v_trips)
        v_acq = float(v.acq_cost)
        v_net = v_rev - (v_fuel + v_maint)
        v_roi = (v_net / v_acq * 100) if v_acq > 0 else 0.0
        roi_pcts.append(v_roi)
    
    # Sort and take top 3
    vehicle_costs.sort(key=lambda x: x.cost, reverse=True)
    top_costly = vehicle_costs[:3]
    
    # Average ROI
    avg_roi = round(sum(roi_pcts) / len(roi_pcts), 1) if roi_pcts else 0.0
    
    # 5. Fuel Efficiency
    total_odo_res = await db.exec(select(func.sum(Vehicle.odometer)))
    total_odo = float(total_odo_res.first() or 0.0)
    total_liters_res = await db.exec(select(func.sum(FuelLog.liters)))
    total_liters = float(total_liters_res.first() or 0.0)
    fuel_efficiency = round(total_odo / total_liters, 1) if total_liters > 0.0 else 0.0

    return DashboardKPIs(
        active_vehicles=v_active + v_shop, # Total non-idle assets
        available_vehicles=v_avail,
        vehicles_in_maintenance=v_shop,
        active_trips=t_active,
        pending_trips=t_pending,
        drivers_on_duty=d_duty,
        fleet_utilization_pct=round(util_pct, 1) if total_vehicles > 0 else 0.0,
        fuel_efficiency_km_l=fuel_efficiency,
        total_operational_cost=round(agg_operational_cost, 2),
        avg_vehicle_roi_pct=avg_roi,
        top_costliest_vehicles=top_costly
    )
