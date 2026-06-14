from fastapi import Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database.connection import AsyncSessionLocal


async def verify_internal_key(x_internal_key: str = Header(...)) -> None:
    """Ensure requests come from the trusted API service, not public internet."""
    if x_internal_key != settings.INTERNAL_API_KEY:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid internal key")


async def get_db() -> AsyncSession:  # type: ignore[return]
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
