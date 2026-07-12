from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional

from api.dependencies import get_db, require_roles
from packages.db.models.fleet import Vehicle, Driver 
from api.fleet.schemas import (
    VehicleCreate, VehicleResponse, VehicleUpdate,
    DriverCreate, DriverResponse, DriverUpdate
)

router = APIRouter()

# Role constants
ALL_AUTHENTICATED = ["Fleet Manager", "Dispatcher", "Driver", "Safety Officer", "Financial Analyst"]
FLEET_AND_SAFETY = ["Fleet Manager", "Safety Officer"]
FLEET_ONLY = ["Fleet Manager"]

# =====================================================================
# VEHICLES REGISTRY ENDPOINTS
# =====================================================================

@router.post("/vehicles", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_roles(FLEET_ONLY))])
async def create_vehicle(vehicle_in: VehicleCreate, db: AsyncSession = Depends(get_db)):
    """Registers a fresh fleet vehicle. Validates unique registration parameters."""
    stmt = select(Vehicle).where(Vehicle.reg_no == vehicle_in.reg_no)
    result = await db.exec(stmt)
    if result.first():
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

@router.get("/vehicles", response_model=List[VehicleResponse], dependencies=[Depends(require_roles(ALL_AUTHENTICATED))])
async def list_vehicles(
    status_filter: Optional[str] = Query(None, alias="status"),
    type_filter: Optional[str] = Query(None, alias="type"),
    search: Optional[str] = Query(None, alias="search"),
    db: AsyncSession = Depends(get_db)
):
    """Fetches list of vehicles. Supports filtering for dispatch selection drops."""
    stmt = select(Vehicle)
    if status_filter:
        stmt = stmt.where(Vehicle.status == status_filter)
    if type_filter:
        stmt = stmt.where(Vehicle.type == type_filter)
    if search:
        stmt = stmt.where(Vehicle.reg_no.ilike(f"%{search}%"))
        
    result = await db.exec(stmt)
    return result.all()

@router.put("/vehicles/{vehicle_id}", response_model=VehicleResponse, dependencies=[Depends(require_roles(FLEET_ONLY))])
async def update_vehicle(vehicle_id: int, vehicle_in: VehicleUpdate, db: AsyncSession = Depends(get_db)):
    """Updates internal metrics, lifecycle statuses, or manual odometer readings."""
    db_vehicle = await db.get(Vehicle, vehicle_id)
    if not db_vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle asset not found.")
    
    update_data = vehicle_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_vehicle, key, value)
        
    await db.commit()
    await db.refresh(db_vehicle)
    return db_vehicle

# =====================================================================
# DRIVER REGISTRY ENDPOINTS
# =====================================================================

@router.post("/drivers", response_model=DriverResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_roles(FLEET_AND_SAFETY))])
async def create_driver(driver_in: DriverCreate, db: AsyncSession = Depends(get_db)):
    """Creates an active driver resource registry context profile."""
    stmt = select(Driver).where(Driver.license_no == driver_in.license_no)
    result = await db.exec(stmt)
    if result.first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Driver with license number '{driver_in.license_no}' already registered."
        )
        
    db_driver = Driver(**driver_in.model_dump(), status="Available")
    db.add(db_driver)
    await db.commit()
    await db.refresh(db_driver)
    return db_driver

@router.get("/drivers", response_model=List[DriverResponse], dependencies=[Depends(require_roles(ALL_AUTHENTICATED))])
async def list_drivers(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db)
):
    """Lists system operators. Can be filtered to locate available personnel."""
    stmt = select(Driver)
    if status_filter:
        stmt = stmt.where(Driver.status == status_filter)
        
    result = await db.exec(stmt)
    return result.all()

@router.put("/drivers/{driver_id}", response_model=DriverResponse, dependencies=[Depends(require_roles(FLEET_AND_SAFETY))])
async def update_driver(driver_id: int, driver_in: DriverUpdate, db: AsyncSession = Depends(get_db)):
    """Modifies operator status fields (e.g., handling suspensions or off-duty toggles)."""
    db_driver = await db.get(Driver, driver_id)
    if not db_driver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver record not found.")
        
    update_data = driver_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_driver, key, value)
        
    await db.commit()
    await db.refresh(db_driver)
    return db_driver
