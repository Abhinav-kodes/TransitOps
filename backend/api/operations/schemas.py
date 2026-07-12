from pydantic import BaseModel, Field
from typing import Optional, List, Literal
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

class MaintenanceDetailResponse(BaseModel):
    id: int
    vehicle_id: int
    vehicle_name: Optional[str] = None
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

class TripDetailResponse(TripResponse):
    driver_name: Optional[str] = None
    vehicle_name: Optional[str] = None

class TripCompletePayload(BaseModel):
    final_odometer: int = Field(..., ge=0)
    fuel_consumed_liters: float = Field(..., gt=0)
    fuel_cost: float = Field(..., gt=0)

# --- TRIP PLANNING (TollGuru) ---

class TripPlanRequest(BaseModel):
    """Input for the /trips/plan endpoint. Triggers a TollGuru route query."""
    source: str = Field(..., description="Origin address, e.g. 'Kanpur, Uttar Pradesh, India'")
    destination: str = Field(..., description="Destination address, e.g. 'Delhi, India'")
    cargo_weight: int = Field(..., gt=0, description="Cargo weight in kg for capacity validation")
    vehicle_id: int = Field(..., description="DB ID of the vehicle being dispatched")
    driver_id: int = Field(..., description="DB ID of the assigned driver")

class RouteSelectionOption(BaseModel):
    """
    A single route card returned by /trips/plan.

    The `polyline` field is a Google-encoded polyline string. On the React
    frontend, decode it with:
        google.maps.geometry.encoding.decodePath(polyline)
    to render the path on Google Maps.
    """
    route_name: str = Field(..., description="Human-readable route name, e.g. 'Agra Lucknow Expressway'")
    labels: List[str] = Field(..., description="TollGuru route badges, e.g. ['practical', 'fastest']")
    distance_km: int = Field(..., description="Rounded distance in km (distance.value / 1000)")
    distance_text: str = Field(..., description="Human-readable distance string, e.g. '312 mi'")
    duration_text: str = Field(..., description="Estimated travel time, e.g. '8 h 33 min'")
    toll_cost: float = Field(..., description="FasTag toll cost in INR (costs.tag)")
    estimated_fuel: float = Field(..., description="Estimated fuel cost in INR (costs.fuel)")
    polyline: str = Field(..., description="Google-encoded polyline for rendering on Maps")

class TripConfirmPayload(BaseModel):
    """
    Sent by the frontend after the dispatcher selects a route card.
    Creates a Trip row in DRAFT status. No assets are locked at this stage;
    dispatch and asset locking happen via PUT /trips/{id}/dispatch.
    """
    source: str
    destination: str
    cargo_weight: int = Field(..., gt=0)
    vehicle_id: int
    driver_id: int
    trip_code: str = Field(..., description="Unique trip identifier, e.g. 'TR-2026-001'")
    selected_route_name: str = Field(..., description="Name of the route the dispatcher chose")
    planned_dist: int = Field(..., gt=0, description="Distance in km from the chosen route card")
    toll_cost: float = Field(..., ge=0, description="FasTag toll cost from the chosen route card")
