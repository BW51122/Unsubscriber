"""
Database connection and session management
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from config import settings
from utils.logger import logger


class Base(DeclarativeBase):
    """Base class for all database models"""
    pass


# Create async engine
engine = create_async_engine(
    settings.get_database_url(),
    echo=settings.debug,
    future=True,
)

# Create session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_db():
    """Initialize database tables"""
    logger.info("Initializing database")
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    logger.info("Database initialized successfully")


async def get_db() -> AsyncSession:
    """
    Dependency for getting database session
    
    Usage in FastAPI:
        @app.get("/something")
        async def route(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

