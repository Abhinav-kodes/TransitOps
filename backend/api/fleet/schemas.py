from pydantic import BaseModel, Field
from datetime import date
from typing import Optional, Literal

# --- VEHICLE SCHEMAS ---
VehicleStatus = Literal["Available", "On Trip", "In Shop", "Retired"]

class VehicleBase(BaseModel):
    reg_no: str = Field(..., description="Unique government registration number")
    name_model: str = Field(..., description="e.g., VAN-05, TRUCK-11")
    type: str = Field(..., description="Vehicle type e.g., Van, Mini, Truck")
    capacity_kg: int = Field(..., gt=0, description="Max payload weight in kg")
    odometer: int = Field(..., ge=0, description="Current total mileage tracking")
    acq_cost: float = Field(..., gt=0, description="Asset purchase cost for ROI calculation")

class VehicleCreate(VehicleBase):
    pass

class VehicleUpdate(BaseModel):
    name_model: Optional[str] = None
    type: Optional[str] = None
    capacity_kg: Optional[int] = None
    odometer: Optional[int] = None
    status: Optional[VehicleStatus] = None

class VehicleResponse(VehicleBase):
    id: int
    status: VehicleStatus
    document_url: Optional[str] = None

    class Config:
        from_attributes = True

# --- DRIVER SCHEMAS ---
DriverStatus = Literal["Available", "On Trip", "Off Duty", "Suspended"]

class DriverBase(BaseModel):
    name: str
    license_no: str
    category: Literal["LMV", "HMV"]
    expiry_date: date
    contact_no: str
    safety_score: int = Field(default=100, ge=0, le=100)

class DriverCreate(DriverBase):
    pass

class DriverUpdate(BaseModel):
    name: Optional[str] = None
    expiry_date: Optional[date] = None
    contact_no: Optional[str] = None
    safety_score: Optional[int] = None
    status: Optional[DriverStatus] = None

class DriverResponse(DriverBase):
    id: int
    status: DriverStatus
    license_url: Optional[str] = None

    class Config:
        from_attributes = True
