import datetime
from decimal import Decimal
from typing import Optional
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Numeric, CheckConstraint, Column as SaColumn

class FuelLog(SQLModel, table=True):
    __tablename__ = "fuel_logs"
    __table_args__ = (
        CheckConstraint("liters > 0", name="check_fuel_liters_positive"),
        CheckConstraint("fuel_cost >= 0", name="check_fuel_cost_non_negative"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    vehicle_id: int = Field(foreign_key="vehicles.id", index=True, nullable=False)
    date: datetime.date = Field(nullable=False)
    liters: Decimal = Field(sa_column=SaColumn(Numeric(6, 2), nullable=False))
    fuel_cost: Decimal = Field(sa_column=SaColumn(Numeric(10, 2), nullable=False))

    # Relationships
    vehicle: "Vehicle" = Relationship(back_populates="fuel_logs")

class Expense(SQLModel, table=True):
    __tablename__ = "expenses"
    __table_args__ = (
        CheckConstraint("toll >= 0", name="check_expense_toll_non_negative"),
        CheckConstraint("other >= 0", name="check_expense_other_non_negative"),
        CheckConstraint("total_cost >= 0", name="check_expense_total_non_negative"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    trip_id: Optional[int] = Field(default=None, foreign_key="trips.id", index=True, nullable=True)
    vehicle_id: int = Field(foreign_key="vehicles.id", index=True, nullable=False)
    maint_id: Optional[int] = Field(default=None, foreign_key="maintenance_logs.id", index=True, nullable=True)
    
    toll: Decimal = Field(default=Decimal("0.00"), sa_column=SaColumn(Numeric(8, 2), nullable=False))
    other: Decimal = Field(default=Decimal("0.00"), sa_column=SaColumn(Numeric(8, 2), nullable=False))
    total_cost: Decimal = Field(sa_column=SaColumn(Numeric(12, 2), nullable=False))

    # Relationships
    trip: Optional["Trip"] = Relationship(back_populates="expenses")
    vehicle: "Vehicle" = Relationship(back_populates="expenses")
    maintenance_log: Optional["MaintenanceLog"] = Relationship(back_populates="expenses")