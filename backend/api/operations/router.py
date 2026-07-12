from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from datetime import date
from typing import List

import httpx

from api.dependencies import get_db, require_roles
from packages.db.models.fleet import Vehicle, Driver
from packages.db.models.ops import Trip, MaintenanceLog, TripStatus
from packages.utils.tollguru_client import fetch_routes, resolve_vehicle_type
from api.operations.schemas import (
    TripCreate, TripResponse, TripCompletePayload,
    MaintenanceCreate, MaintenanceResponse, TripDetailResponse,
    TripPlanRequest, RouteSelectionOption, TripConfirmPayload,
)

router = APIRouter()

# Role constants
DISPATCHER_ONLY = ["Dispatcher"]
DISPATCHER_AND_DRIVER = ["Dispatcher", "Driver"]
FLEET_MANAGER_ONLY = ["Fleet Manager"]
ALL_AUTHENTICATED = ["Fleet Manager", "Dispatcher", "Driver", "Safety Officer", "Financial Analyst"]

# =====================================================================
# ROUTE PLANNING — TOLLGURU INTEGRATION
# =====================================================================

@router.post("/trips/plan", response_model=List[RouteSelectionOption], dependencies=[Depends(require_roles(DISPATCHER_AND_DRIVER))])
async def plan_trip_routes(
    plan_in: TripPlanRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Step 1 of 2 — Route Planning.

    Performs a capacity pre-flight check, then calls TollGuru to retrieve
    2–3 route options. Each option contains a Google-encoded `polyline`
    ready for rendering on Google Maps, plus cost summaries for the UI cards.

    No database row is created at this stage.
    """
    # --- Capacity pre-flight check ---
    vehicle = await db.get(Vehicle, plan_in.vehicle_id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle with id {plan_in.vehicle_id} not found.",
        )

    if plan_in.cargo_weight > vehicle.capacity_kg:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Capacity breach: cargo weight ({plan_in.cargo_weight} kg) "
                f"exceeds vehicle max capacity ({vehicle.capacity_kg} kg)."
            ),
        )

    # --- TollGuru API call ---
    tg_vehicle_type = resolve_vehicle_type(vehicle.type)
    try:
        raw_routes = await fetch_routes(
            source=plan_in.source,
            destination=plan_in.destination,
            tollguru_vehicle_type=tg_vehicle_type,
            cargo_weight_kg=plan_in.cargo_weight,
        )
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"TollGuru API error: {exc.response.status_code} — {exc.response.text[:200]}",
        )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"TollGuru network error: {str(exc)}",
        )

    if not raw_routes:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="TollGuru returned no routes for the given origin/destination.",
        )

    # --- Parse and transform each route ---
    options: list[RouteSelectionOption] = []
    for route in raw_routes:
        summary = route.get("summary", {})
        costs = route.get("costs", {})

        route_name = summary.get("name") or "Unnamed Route"
        labels = summary.get("labels") or []

        distance_info = summary.get("distance", {})
        distance_value = distance_info.get("value", 0)   # meters
        distance_text = distance_info.get("text") or distance_info.get("metric") or ""
        distance_km = round(distance_value / 1000)

        duration_text = summary.get("duration", {}).get("text") or ""

        # Prefer FasTag (tag) cost; fall back to tagAndCash, then cash, then 0
        toll_cost = float(
            costs.get("tag")
            or costs.get("tagAndCash")
            or costs.get("cash")
            or 0.0
        )
        estimated_fuel = float(costs.get("fuel") or 0.0)

        polyline = route.get("polyline") or ""

        options.append(
            RouteSelectionOption(
                route_name=route_name,
                labels=labels,
                distance_km=distance_km,
                distance_text=distance_text,
                duration_text=duration_text,
                toll_cost=toll_cost,
                estimated_fuel=estimated_fuel,
                polyline=polyline,
            )
        )

    return options


@router.post("/trips/confirm", response_model=TripResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_roles(DISPATCHER_AND_DRIVER))])
async def confirm_trip_route(
    confirm_in: TripConfirmPayload,
    db: AsyncSession = Depends(get_db),
):
    """
    Step 2 of 2 — Route Confirmation.

    Creates a Trip row in DRAFT status seeded with the dispatcher's chosen
    route parameters (planned_dist and toll_cost from the selected route card).

    Assets (vehicle/driver) are NOT locked here. Use PUT /trips/{id}/dispatch
    to lock assets and transition the trip to Dispatched.
    """
    # --- Ensure trip_code is unique ---
    existing = await db.exec(select(Trip).where(Trip.trip_code == confirm_in.trip_code))
    if existing.first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Trip with code '{confirm_in.trip_code}' already exists.",
        )

    # --- Create the Draft trip ---
    db_trip = Trip(
        trip_code=confirm_in.trip_code,
        source=confirm_in.source,
        destination=confirm_in.destination,
        vehicle_id=confirm_in.vehicle_id,
        driver_id=confirm_in.driver_id,
        cargo_weight=confirm_in.cargo_weight,
        planned_dist=confirm_in.planned_dist,
        toll_cost=confirm_in.toll_cost,
        status=TripStatus.DRAFT,
    )
    db.add(db_trip)
    await db.commit()
    await db.refresh(db_trip)
    return db_trip



@router.get("/trips", response_model=List[TripDetailResponse], dependencies=[Depends(require_roles(ALL_AUTHENTICATED))])
async def list_trips(db: AsyncSession = Depends(get_db)):
    """Lists all trips in the system with vehicle and driver details."""
    res = await db.exec(select(Trip))
    trips = res.all()
    
    details = []
    for trip in trips:
        driver_name = None
        if trip.driver_id:
            driver = await db.get(Driver, trip.driver_id)
            if driver:
                driver_name = driver.name
                
        vehicle_name = None
        if trip.vehicle_id:
            vehicle = await db.get(Vehicle, trip.vehicle_id)
            if vehicle:
                vehicle_name = vehicle.name_model or vehicle.reg_no
                
        details.append(
            TripDetailResponse(
                id=trip.id,
                trip_code=trip.trip_code,
                source=trip.source,
                destination=trip.destination,
                vehicle_id=trip.vehicle_id,
                driver_id=trip.driver_id,
                cargo_weight=trip.cargo_weight,
                planned_distance=trip.planned_distance,
                toll_cost=trip.toll_cost,
                status=trip.status,
                driver_name=driver_name,
                vehicle_name=vehicle_name
            )
        )
    return details

# =====================================================================
# MAINTENANCE WORKFLOWS
# =====================================================================

@router.post("/maintenance", response_model=MaintenanceResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_roles(FLEET_MANAGER_ONLY))])
async def create_maintenance_record(log_in: MaintenanceCreate, db: AsyncSession = Depends(get_db)):
    """Creates a maintenance log and automatically sets the vehicle to 'In Shop' status."""
    vehicle = await db.get(Vehicle, log_in.vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found.")
    
    # Rule Check: Cannot send an already retired vehicle to the workshop
    if vehicle.status == "Retired":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot send a retired vehicle to maintenance.")

    # Business Rule: Switch status to 'In Shop', removing it from dispatch pool
    vehicle.status = "In Shop"
    
    db_log = MaintenanceLog(**log_in.model_dump(), status="Active")
    db.add(db_log)
    await db.commit()
    await db.refresh(db_log)
    return db_log

@router.put("/maintenance/{log_id}/complete", response_model=MaintenanceResponse, dependencies=[Depends(require_roles(FLEET_MANAGER_ONLY))])
async def complete_maintenance(log_id: int, db: AsyncSession = Depends(get_db)):
    """Closes a maintenance record, restoring the vehicle status back to 'Available'."""
    log = await db.get(MaintenanceLog, log_id)
    if not log or log.status == "Completed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Active maintenance log not found.")
        
    vehicle = await db.get(Vehicle, log.vehicle_id)
    if vehicle and vehicle.status == "In Shop":
        vehicle.status = "Available"
        
    log.status = "Completed"
    await db.commit()
    await db.refresh(log)
    return log

# =====================================================================
# TRIP DISPATCHER STATE MACHINE
# =====================================================================

@router.post("/trips", response_model=TripResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_roles(DISPATCHER_ONLY))])
async def create_trip_draft(trip_in: TripCreate, db: AsyncSession = Depends(get_db)):
    """Creates a new trip draft layout blueprint."""
    trip_data = trip_in.model_dump()
    trip_data["planned_dist"] = trip_data.pop("planned_distance")
    db_trip = Trip(**trip_data, status="Draft", toll_cost=0.0)
    db.add(db_trip)
    await db.commit()
    await db.refresh(db_trip)
    return db_trip

@router.put("/trips/{trip_id}/dispatch", response_model=TripResponse, dependencies=[Depends(require_roles(DISPATCHER_ONLY))])
async def dispatch_trip(trip_id: int, db: AsyncSession = Depends(get_db)):
    """Validates core capacity, compliance, and availability constraints before dispatching."""
    trip = await db.get(Trip, trip_id)
    if not trip or trip.status != "Draft":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Trip must be in Draft state to dispatch.")
        
    if not trip.vehicle_id or not trip.driver_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Trip draft must have a vehicle and driver assigned to dispatch.")

    vehicle = await db.get(Vehicle, trip.vehicle_id)
    driver = await db.get(Driver, trip.driver_id)
    
    if not vehicle or not driver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assigned vehicle or driver records missing.")

    # 1. Validation Rule: Cargo Weight limit enforcement
    if trip.cargo_weight > vehicle.capacity_kg:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Dispatch blocked: Cargo weight ({trip.cargo_weight}kg) exceeds vehicle max capacity ({vehicle.capacity_kg}kg)."
        )

    # 2. Validation Rule: Asset Availability status checkpoints
    if vehicle.status != "Available":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Assigned vehicle status is currently '{vehicle.status}'.")
    if driver.status != "Available":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Assigned driver status is currently '{driver.status}'.")

    # 3. Validation Rule: Driver License compliance check
    if driver.expiry_date < date.today():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Dispatch blocked: Assigned driver has an expired license.")

    # State Mutation Transitions: Lock assets dynamically
    vehicle.status = "On Trip"
    driver.status = "On Trip"
    trip.status = "Dispatched"
    
    # Programmatic Toll Calculation Helper Integration (Only if not already calculated by TollGuru)
    if not trip.toll_cost or trip.toll_cost == 0.0:
        multiplier = 2.5 if vehicle.type.lower() == "truck" else (1.5 if vehicle.type.lower() == "mini" else 1.0)
        trip.toll_cost = trip.planned_distance * 2.0 * multiplier

    await db.commit()
    await db.refresh(trip)
    return trip

@router.put("/trips/{trip_id}/complete", response_model=TripResponse, dependencies=[Depends(require_roles(DISPATCHER_AND_DRIVER))])
async def complete_trip(trip_id: int, payload: TripCompletePayload, db: AsyncSession = Depends(get_db)):
    """Completes trip execution, updates the asset metrics, and returns both to 'Available'."""
    trip = await db.get(Trip, trip_id)
    if not trip or trip.status != "Dispatched":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only actively Dispatched trips can be marked Completed.")

    vehicle = await db.get(Vehicle, trip.vehicle_id)
    driver = await db.get(Driver, trip.driver_id)

    if vehicle:
        if payload.final_odometer < vehicle.odometer:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Final odometer reading cannot be less than initial odometer.")
        vehicle.odometer = payload.final_odometer
        vehicle.status = "Available"
        
    if driver:
        driver.status = "Available"

    trip.status = "Completed"
    
    await db.commit()
    await db.refresh(trip)
    return trip

@router.put("/trips/{trip_id}/cancel", response_model=TripResponse, dependencies=[Depends(require_roles(DISPATCHER_ONLY))])
async def cancel_trip(trip_id: int, db: AsyncSession = Depends(get_db)):
    """Cancels an active or draft trip execution plan, freeing up locked infrastructure assets."""
    trip = await db.get(Trip, trip_id)
    if not trip or trip.status in ["Completed", "Cancelled"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot cancel a closed or already cancelled trip sequence.")

    # If the trip was active, free the assets
    if trip.status == "Dispatched":
        vehicle = await db.get(Vehicle, trip.vehicle_id)
        driver = await db.get(Driver, trip.driver_id)
        if vehicle:
            vehicle.status = "Available"
        if driver:
            driver.status = "Available"

    trip.status = "Cancelled"
    await db.commit()
    await db.refresh(trip)
    return trip
