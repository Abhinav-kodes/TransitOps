from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

# Explicitly importing from your existing isolated packages setup
from packages.db import get_session
from packages.db.models.auth import User, Role, RoleName
from api.authentication.schemas import UserRegister, UserResponse, RoleResponse, Token
from api.authentication.security import get_password_hash, verify_password, create_access_token
from api.dependencies import get_current_user

router = APIRouter()

# =====================================================================
# SYSTEM ROLES MANAGEMENT
# =====================================================================

@router.get("/roles", response_model=list[RoleResponse])
async def get_roles(db: AsyncSession = Depends(get_session)):
    """Retrieves all roles to populate UI registration/login dropdown components."""
    result = await db.exec(select(Role))
    return result.all()

@router.post("/roles/seed", status_code=status.HTTP_201_CREATED)
async def seed_roles(db: AsyncSession = Depends(get_session)):
    """System-only initialization endpoint to rapidly spin up required hackathon scopes."""
    required_roles = [RoleName.FLEET_MANAGER, RoleName.DISPATCHER, RoleName.DRIVER, RoleName.SAFETY_OFFICER, RoleName.FINANCIAL_ANALYST, RoleName.ADMIN]
    
    for role_name in required_roles:
        result = await db.exec(select(Role).where(Role.name == role_name))
        existing = result.first()
        if not existing:
            db.add(Role(name=role_name))
            
    await db.commit()
    return {"message": "System roles successfully seeded"}

# =====================================================================
# AUTHENTICATION & USER REGISTRY
# =====================================================================

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user_in: UserRegister, db: AsyncSession = Depends(get_session)):
    """Creates a fresh system user profile securely associated with an exact role parameter."""
    # Block registration with privileged roles
    blocked_roles = {RoleName.ADMIN.value, RoleName.FLEET_MANAGER.value, RoleName.SAFETY_OFFICER.value, RoleName.FINANCIAL_ANALYST.value}
    result_role_check = await db.exec(select(Role).where(Role.id == user_in.role_id))
    target_role = result_role_check.first()
    if target_role and target_role.name.value in blocked_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Registration with this role is not permitted through public signup."
        )
        
    # Check if identity vector is already occupied
    result = await db.exec(select(User).where(User.email == user_in.email))
    existing_user = result.first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account is already registered with this email address."
        )
        
    # Verify the target role exists
    result_role = await db.exec(select(Role).where(Role.id == user_in.role_id))
    role = result_role.first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The specified system role identifier is invalid."
        )

    hashed_password = get_password_hash(user_in.password)
    new_user = User(
        email=user_in.email,
        hashed_password=hashed_password,
        role_id=user_in.role_id
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user

@router.post("/login", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: AsyncSession = Depends(get_session)
):
    """Standard OAuth2 token generation hub verifying profile data."""
    result = await db.exec(select(User).where(User.email == form_data.username))
    user = result.first()
    
    # Verify the plain password matches the hashed password stored in the database
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed: Invalid credentials provided.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Fetch the role name directly via relationship configuration or raw query
    result_role = await db.exec(select(Role).where(Role.id == user.role_id))
    role = result_role.first()
    role_name = role.name if role else "Guest"

    # Generate a real signed JWT access token containing identity claims
    access_token = create_access_token(data={"sub": user.email, "role": role_name})
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def get_current_active_user(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """The UI layout anchor. Returns active user data to mount front-end visibility layouts."""
    result_role = await db.exec(select(Role).where(Role.id == current_user.role_id))
    role = result_role.first()
    role_name = role.name if role else "Guest"

    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        role_id=current_user.role_id,
        role_name=role_name,
    )
