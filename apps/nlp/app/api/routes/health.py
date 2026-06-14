from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    from app.services.embedding_service import EmbeddingService
    return HealthResponse(status="ok", model_loaded=EmbeddingService.is_ready())
