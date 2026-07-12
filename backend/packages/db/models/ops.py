from enum import Enum
from decimal import Decimal
from typing import List, Optional
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Numeric, CheckConstraint, Column as SaColumn

class TripStatus(str, Enum):
    DRAFT = "Draft"
    DISPATCHED = "Dispatched"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"

class MaintenanceStatus(str, Enum):
    ACTIVE = "Active"
    COMPLETED = "Completed"

class Trip(SQLModel, table=True):
    __tablename__ = "trips"
    __table_args__ = (
        CheckConstraint("cargo_weight >= 0", name="check_trip_weight_non_negative"),
        CheckConstraint("planned_dist >= 0", name="check_trip_dist_non_negative"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    trip_code: str = Field(sa_column_kwargs={"unique": True}, index=True, nullable=False)
    source: str = Field(max_length=255, nullable=False)
    destination: str = Field(max_length=255, nullable=False)
    
    vehicle_id: Optional[int] = Field(default=None, foreign_key="vehicles.id", index=True, nullable=True)
    driver_id: Optional[int] = Field(default=None, foreign_key="drivers.id", index=True, nullable=True)
    
    cargo_weight: int = Field(nullable=False)
    planned_dist: int = Field(nullable=False)
    status: TripStatus = Field(default=TripStatus.DRAFT, nullable=False)

    # Relationships
    vehicle: Optional["Vehicle"] = Relationship(back_populates="trips")
    driver: Optional["Driver"] = Relationship(back_populates="trips")
    expenses: List["Expense"] = Relationship(back_populates="trip")

class MaintenanceLog(SQLModel, table=True):
    __tablename__ = "maintenance_logs"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    vehicle_id: int = Field(foreign_key="vehicles.id", index=True, nullable=False)
    service_type: str = Field(max_length=100, nullable=False)
    cost: Decimal = Field(sa_column=SaColumn(Numeric(10, 2), nullable=False))
    entry_date: str = Field(nullable=False)
    status: MaintenanceStatus = Field(default=MaintenanceStatus.ACTIVE, nullable=False)

    # Relationships
    vehicle: "Vehicle" = Relationship(back_populates="maintenance_logs")
    expenses: List["Expense"] = Relationship(back_populates="maintenance_log")