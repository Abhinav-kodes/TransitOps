from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from packages.db import get_session
from packages.db.models.auth import User
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
