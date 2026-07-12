from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from datetime import date

from api.dependencies import get_db
# Importing the existing database models from your decoupled package setup
from packages.db.models.fleet import Vehicle, Driver 
from api.fleet.schemas import (
    VehicleCreate, VehicleResponse, VehicleUpdate,
    DriverCreate, DriverResponse, DriverUpdate
)

router = APIRouter()

# =====================================================================
# VEHICLES REGISTRY ENDPOINTS
# =====================================================================

@router.post("/vehicles", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
async def create_vehicle(vehicle_in: VehicleCreate, db: AsyncSession = Depends(get_db)):
    """Registers a fresh fleet vehicle. Validates unique registration parameters."""
    stmt = select(Vehicle).where(Vehicle.reg_no == vehicle_in.reg_no)
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Vehicle with registration number '{vehicle_in.reg_no}' already exists."
        )
    
    # Initialize with default operational status 'Available'
    db_vehicle = Vehicle(**vehicle_in.model_dump(), status="Available")
    db.add(db_vehicle)
    await db.commit()
    await db.refresh(db_vehicle)
    return db_vehicle

@router.get("/vehicles", response_model=List[VehicleResponse])
async def list_vehicles(
    status_filter: Optional[str] = Query(None, alias="status"),
    type_filter: Optional[str] = Query(None, alias="type"),
    db: AsyncSession = Depends(get_db)
):
    """Fetches list of vehicles. Supports filtering for dispatch selection drops."""
    stmt = select(Vehicle)
    if status_filter:
        stmt = stmt.where(Vehicle.status == status_filter)
    if type_filter:
        stmt = stmt.where(Vehicle.type == type_filter)
        
    result = await db.execute(stmt)
    return result.scalars().all()

@router.put("/vehicles/{vehicle_id}", response_model=VehicleResponse)
async def update_vehicle(vehicle_id: int, vehicle_in: VehicleUpdate, db: AsyncSession = Depends(get_db)):
    """Updates internal metrics, lifecycle statuses, or manual odometer readings."""
    db_vehicle = await db.get(Vehicle, vehicle_id)
    if not db_vehicle:
        raise HTTPException(status_code=404, detail="Vehicle asset not found.")
    
    update_data = vehicle_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_vehicle, key, value)
        
    await db.commit()
    await db.refresh(db_vehicle)
    return db_vehicle

# =====================================================================
# DRIVER REGISTRY ENDPOINTS
# =====================================================================

@router.post("/drivers", response_model=DriverResponse, status_code=status.HTTP_201_CREATED)
async def create_driver(driver_in: DriverCreate, db: AsyncSession = Depends(get_db)):
    """Creates an active driver resource registry context profile."""
    stmt = select(Driver).where(Driver.license_no == driver_in.license_no)
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Driver with license number '{driver_in.license_no}' already registered."
        )
        
    driver_data = driver_in.model_dump()
    if isinstance(driver_data.get("expiry_date"), date):
        driver_data["expiry_date"] = driver_data["expiry_date"].isoformat()
        
    db_driver = Driver(**driver_data, status="Available")
    db.add(db_driver)
    await db.commit()
    await db.refresh(db_driver)
    return db_driver

@router.get("/drivers", response_model=List[DriverResponse])
async def list_drivers(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db)
):
    """Lists system operators. Can be filtered to locate available personnel."""
    stmt = select(Driver)
    if status_filter:
        stmt = stmt.where(Driver.status == status_filter)
        
    result = await db.execute(stmt)
    return result.scalars().all()

@router.put("/drivers/{driver_id}", response_model=DriverResponse)
async def update_driver(driver_id: int, driver_in: DriverUpdate, db: AsyncSession = Depends(get_db)):
    """Modifies operator status fields (e.g., handling suspensions or off-duty toggles)."""
    db_driver = await db.get(Driver, driver_id)
    if not db_driver:
        raise HTTPException(status_code=404, detail="Driver record not found.")
        
    update_data = driver_in.model_dump(exclude_unset=True)
    if isinstance(update_data.get("expiry_date"), date):
        update_data["expiry_date"] = update_data["expiry_date"].isoformat()
        
    for key, value in update_data.items():
        setattr(db_driver, key, value)
        
    await db.commit()
    await db.refresh(db_driver)
    return db_driver
