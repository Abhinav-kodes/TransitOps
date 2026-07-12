import os
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+asyncpg://transitops_admin:internal_secure_pass@db:5432/transitops_prod"
)

# Enforce a connection pool size suited for concurrent platform operations
async_engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_size=20,
    max_overflow=10,
    future=True
)

AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

async def init_db() -> None:
    """Initializes schema definitions inside the target operational database."""
    async with async_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        
    # Auto-seed the roles
    from packages.db.models.auth import Role, RoleName
    from sqlmodel import select
    
    async with AsyncSessionLocal() as session:
        required_roles = [RoleName.FLEET_MANAGER, RoleName.DISPATCHER, RoleName.DRIVER, RoleName.ADMIN]
        for role_name in required_roles:
            result = await session.exec(select(Role).where(Role.name == role_name))
            existing = result.first()
            if not existing:
                session.add(Role(name=role_name))
        await session.commit()

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency provider yielding isolated atomic asynchronous sessions."""
    async with AsyncSessionLocal() as session:
        yield session