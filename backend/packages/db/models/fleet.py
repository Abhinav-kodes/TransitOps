from enum import Enum
from decimal import Decimal
from typing import List, Optional
from datetime import date
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Numeric, CheckConstraint, Column as SaColumn

class VehicleStatus(str, Enum):
    AVAILABLE = "Available"
    ON_TRIP = "On Trip"
    IN_SHOP = "In Shop"
    RETIRED = "Retired"

class DriverStatus(str, Enum):
    AVAILABLE = "Available"
    ON_TRIP = "On Trip"
    OFF_DUTY = "Off Duty"
    SUSPENDED = "Suspended"

class Vehicle(SQLModel, table=True):
    __tablename__ = "vehicles"
    __table_args__ = (
        CheckConstraint("capacity_kg > 0", name="check_vehicle_capacity_positive"),
        CheckConstraint("odometer >= 0", name="check_vehicle_odometer_non_negative"),
        CheckConstraint("acq_cost >= 0", name="check_vehicle_acq_cost_non_negative"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    reg_no: str = Field(sa_column_kwargs={"unique": True}, index=True, nullable=False)
    name_model: str = Field(max_length=100, nullable=False)
    type: str = Field(max_length=50, nullable=False)  # Van, Mini, Truck
    capacity_kg: int = Field(nullable=False)
    odometer: int = Field(default=0, nullable=False)
    acq_cost: Decimal = Field(sa_column=SaColumn(Numeric(12, 2), nullable=False))
    status: VehicleStatus = Field(default=VehicleStatus.AVAILABLE, nullable=False)

    # Relationships
    trips: List["Trip"] = Relationship(back_populates="vehicle")
    maintenance_logs: List["MaintenanceLog"] = Relationship(back_populates="vehicle")
    fuel_logs: List["FuelLog"] = Relationship(back_populates="vehicle")
    expenses: List["Expense"] = Relationship(back_populates="vehicle")

class Driver(SQLModel, table=True):
    __tablename__ = "drivers"
    __table_args__ = (
        CheckConstraint("safety_score >= 0 AND safety_score <= 100", name="check_driver_safety_score_bounds"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=100, nullable=False)
    license_no: str = Field(sa_column_kwargs={"unique": True}, index=True, nullable=False)
    category: str = Field(max_length=20, nullable=False)  # LMV, HMV
    expiry_date: date = Field(nullable=False)
    contact_no: str = Field(max_length=20, nullable=False)
    safety_score: int = Field(default=100, nullable=False)
    status: DriverStatus = Field(default=DriverStatus.AVAILABLE, nullable=False)

    # Relationships
    trips: List["Trip"] = Relationship(back_populates="driver")