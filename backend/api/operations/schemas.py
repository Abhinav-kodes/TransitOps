from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import date

# --- MAINTENANCE SCHEMAS ---
class MaintenanceCreate(BaseModel):
    vehicle_id: int
    service_type: str = Field(..., description="e.g., Oil Change, Tyre Replace")
    cost: float = Field(..., ge=0)
    entry_date: date

class MaintenanceResponse(BaseModel):
    id: int
    vehicle_id: int
    service_type: str
    cost: float
    entry_date: date
    status: Literal["Active", "Completed"]
    maintenance_bill_url: Optional[str] = None

    class Config:
        from_attributes = True

# --- TRIP SCHEMAS ---
TripStatus = Literal["Draft", "Dispatched", "Completed", "Cancelled"]

class TripCreate(BaseModel):
    trip_code: str = Field(..., description="e.g., TR001")
    source: str
    destination: str
    vehicle_id: Optional[int] = None
    driver_id: Optional[int] = None
    cargo_weight: int = Field(..., gt=0)
    planned_distance: int = Field(..., gt=0)

class TripResponse(BaseModel):
    id: int
    trip_code: str
    source: str
    destination: str
    vehicle_id: Optional[int]
    driver_id: Optional[int]
    cargo_weight: int
    planned_distance: int
    toll_cost: float
    status: TripStatus

    class Config:
        from_attributes = True

class TripCompletePayload(BaseModel):
    final_odometer: int = Field(..., ge=0)
    fuel_consumed_liters: float = Field(..., gt=0)
    fuel_cost: float = Field(..., gt=0)
