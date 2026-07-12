from pydantic import BaseModel, EmailStr
from typing import Optional

# --- ROLE SCHEMAS ---
class RoleBase(BaseModel):
    name: str

class RoleResponse(RoleBase):
    id: int

    class Config:
        from_attributes = True

# --- USER SCHEMAS ---
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    role_id: int

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    role_id: int
    role_name: str = ""
    driver_id: Optional[int] = None
    driver_safety_score: Optional[int] = None
    driver_status: Optional[str] = None
    driver_license_no: Optional[str] = None

    class Config:
        from_attributes = True

# --- SECURITY SCHEMAS ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
