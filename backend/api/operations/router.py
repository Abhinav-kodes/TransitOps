from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from datetime import date
from typing import List

from api.dependencies import get_db
from packages.db.models.fleet import Vehicle, Driver
from packages.db.models.ops import Trip, MaintenanceLog 
from api.operations.schemas import (
    TripCreate, TripResponse, TripCompletePayload,
    MaintenanceCreate, MaintenanceResponse, TripDetailResponse
)

router = APIRouter()

@router.get("/trips", response_model=List[TripDetailResponse])
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

@router.post("/maintenance", response_model=MaintenanceResponse, status_code=status.HTTP_201_CREATED)
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

@router.put("/maintenance/{log_id}/complete", response_model=MaintenanceResponse)
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

@router.post("/trips", response_model=TripResponse, status_code=status.HTTP_201_CREATED)
async def create_trip_draft(trip_in: TripCreate, db: AsyncSession = Depends(get_db)):
    """Creates a new trip draft layout blueprint."""
    trip_data = trip_in.model_dump()
    trip_data["planned_dist"] = trip_data.pop("planned_distance")
    db_trip = Trip(**trip_data, status="Draft", toll_cost=0.0)
    db.add(db_trip)
    await db.commit()
    await db.refresh(db_trip)
    return db_trip

@router.put("/trips/{trip_id}/dispatch", response_model=TripResponse)
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
    
    # Programmatic Toll Calculation Helper Integration
    # Toll Formula: Distance * Base Rate (e.g., 2.0) * Type Multiplier
    multiplier = 2.5 if vehicle.type.lower() == "truck" else (1.5 if vehicle.type.lower() == "mini" else 1.0)
    trip.toll_cost = trip.planned_distance * 2.0 * multiplier

    await db.commit()
    await db.refresh(trip)
    return trip

@router.put("/trips/{trip_id}/complete", response_model=TripResponse)
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

@router.put("/trips/{trip_id}/cancel", response_model=TripResponse)
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
