from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter()


class MatchRequest(BaseModel):
    dream_id: str = Field(..., description="UUID of the source dream")
    content: str = Field(..., min_length=1, max_length=5000)
    limit: int = Field(20, ge=1, le=50)
    exclude_user_id: str | None = None


class DreamMatch(BaseModel):
    dream_id: str
    similarity_score: float
    rank: int


class MatchResponse(BaseModel):
    source_dream_id: str
    matches: list[DreamMatch]
    total: int


@router.post("/match", response_model=MatchResponse)
async def match_dreams(request: MatchRequest) -> MatchResponse:
    from app.services.matching_service import MatchingService
    matches = await MatchingService.find_matches(
        content=request.content,
        limit=request.limit,
        exclude_user_id=request.exclude_user_id,
    )
    return MatchResponse(source_dream_id=request.dream_id, matches=matches, total=len(matches))
