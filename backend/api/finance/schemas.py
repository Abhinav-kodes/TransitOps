from pydantic import BaseModel, Field
from datetime import date
from typing import Optional, List

# --- LIST RESPONSE SCHEMAS ---
class FuelLogDetailResponse(BaseModel):
    id: int
    vehicle_id: int
    vehicle_name: Optional[str] = None
    date: date
    liters: float
    fuel_cost: float
    fuel_bill_url: Optional[str] = None

    class Config:
        from_attributes = True

class ExpenseDetailResponse(BaseModel):
    id: int
    vehicle_id: int
    vehicle_name: Optional[str] = None
    trip_id: Optional[int] = None
    trip_code: Optional[str] = None
    toll: float
    other: float
    total_cost: float
    expense_bill_url: Optional[str] = None

    class Config:
        from_attributes = True

# --- FUEL LOG SCHEMAS ---
class FuelLogCreate(BaseModel):
    vehicle_id: int
    date: date
    liters: float = Field(..., gt=0)
    fuel_cost: float = Field(..., ge=0)

class FuelLogResponse(BaseModel):
    id: int
    vehicle_id: int
    date: date
    liters: float
    fuel_cost: float

    class Config:
        from_attributes = True

# --- EXPENSE SCHEMAS ---
class ExpenseCreate(BaseModel):
    trip_id: Optional[int] = None
    vehicle_id: int
    maint_id: Optional[int] = None
    toll: float = Field(default=0.0, ge=0)
    other: float = Field(default=0.0, ge=0)
    total_cost: Optional[float] = Field(default=None, ge=0)

class ExpenseResponse(BaseModel):
    id: int
    trip_id: Optional[int]
    vehicle_id: int
    maint_id: Optional[int]
    toll: float
    other: float
    total_cost: float

    class Config:
        from_attributes = True

# --- ROI SCHEMAS ---
class RoiResponse(BaseModel):
    vehicle_id: int
    revenue: float
    maintenance_cost: float
    fuel_cost: float
    acquisition_cost: float
    roi_percentage: float

# --- DASHBOARD KPI SCHEMAS ---
class CostBreakdown(BaseModel):
    vehicle_name: str
    cost: float

class DashboardKPIs(BaseModel):
    active_vehicles: int
    available_vehicles: int
    vehicles_in_maintenance: int
    active_trips: int
    pending_trips: int
    drivers_on_duty: int
    fleet_utilization_pct: float
    fuel_efficiency_km_l: float
    total_operational_cost: float
    avg_vehicle_roi_pct: float
    top_costliest_vehicles: List[CostBreakdown]
