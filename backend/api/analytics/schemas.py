from pydantic import BaseModel
from typing import List, Dict

class DailyUtilization(BaseModel):
    name: str  # e.g. "Mon", "Tue"
    value: int # e.g. 87

class DashboardAnalyticsResponse(BaseModel):
    fleet_utilization: float
    on_time_delivery: float
    safety_incidents: int
    total_trips: int
    avg_fuel_efficiency: float
    vehicle_status_counts: Dict[str, int]
    daily_utilization: List[DailyUtilization]
