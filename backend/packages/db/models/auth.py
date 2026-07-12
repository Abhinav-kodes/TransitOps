from enum import Enum
from typing import List, Optional
from sqlmodel import SQLModel, Field, Relationship

class RoleName(str, Enum):
    FLEET_MANAGER = "Fleet Manager"
    DISPATCHER = "Dispatcher"
    DRIVER = "Driver"
    SAFETY_OFFICER = "Safety Officer"
    FINANCIAL_ANALYST = "Financial Analyst"
    ADMIN = "Admin"

class Role(SQLModel, table=True):
    __tablename__ = "roles"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: RoleName = Field(sa_column_kwargs={"unique": True}, nullable=False)

    # Relationships
    users: List["User"] = Relationship(back_populates="role")

class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(sa_column_kwargs={"unique": True}, index=True, nullable=False)
    hashed_password: str = Field(nullable=False)
    role_id: int = Field(foreign_key="roles.id", index=True, nullable=False)

    # Relationships
    role: Role = Relationship(back_populates="users")
    driver: Optional["Driver"] = Relationship(back_populates="user")