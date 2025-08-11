# backend/db.py
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    create_async_engine,
    async_sessionmaker,
)
from backend.config import settings

# Use env if provided, otherwise a safe local default
# NOTE: URL uses asyncpg driver for PostgreSQL.
DATABASE_URL = getattr(settings, "DATABASE_URL", None) or \
    "postgresql+asyncpg://surveyuser:surveypass@localhost:5432/surveydb"

# Create async engine (with small pool; good defaults for dev/small services)
engine: AsyncEngine = create_async_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # validates connections before reuse
    pool_size=5,
    max_overflow=5,
)

# Exported async session factory (used in repositories)
SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,  # keep attributes accessible after commit
)
