from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List

from packages.db import get_session
from packages.db.models.auth import User, Role
from api.authentication.security import SECRET_KEY, ALGORITHM

# Declares the login URL path that OAuth2 will use to retrieve tokens
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

get_db = get_session

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_session)
) -> User:
    """Security gate dependency to extract JWT and verify active user identity."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
        
    result = await db.exec(select(User).where(User.email == email))
    user = result.first()
    if user is None:
        raise credentials_exception
    return user


async def get_current_user_with_role(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> User:
    """Extends get_current_user by also loading and attaching the role object."""
    result = await db.exec(select(Role).where(Role.id == current_user.role_id))
    role = result.first()
    if role:
        current_user.role = role
    return current_user


def require_roles(allowed_roles: List[str]):
    """
    Factory dependency that enforces role-based access control.
    Admin role bypasses all checks (superuser).
    
    Usage:
        @router.get("/fleet/vehicles", dependencies=[Depends(require_roles(["Fleet Manager", "Dispatcher"]))])
    """
    async def _check_role(current_user: User = Depends(get_current_user_with_role)):
        role_name = getattr(current_user.role, "name", None)
        if role_name and role_name.value == "Admin":
            return current_user
        if role_name is None or role_name.value not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {', '.join(allowed_roles)}",
            )
        return current_user
    return _check_role
