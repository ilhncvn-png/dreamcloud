from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter()


class EmbedRequest(BaseModel):
    dream_id: str = Field(..., description="UUID of the dream")
    content: str = Field(..., min_length=1, max_length=5000)


class EmbedResponse(BaseModel):
    dream_id: str
    vector: list[float]
    dimension: int


@router.post("/embed", response_model=EmbedResponse)
async def embed_dream(request: EmbedRequest) -> EmbedResponse:
    from app.services.embedding_service import EmbeddingService
    vector = await EmbeddingService.embed(request.content)
    return EmbedResponse(dream_id=request.dream_id, vector=vector, dimension=len(vector))
