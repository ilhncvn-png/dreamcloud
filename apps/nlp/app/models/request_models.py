from pydantic import BaseModel, Field


class EmbedRequest(BaseModel):
    dream_id: str = Field(..., description="UUID of the dream")
    content: str = Field(..., min_length=1, max_length=5000)


class MatchRequest(BaseModel):
    dream_id: str = Field(..., description="UUID of the source dream")
    content: str = Field(..., min_length=1, max_length=5000)
    limit: int = Field(20, ge=1, le=50)
    exclude_user_id: str | None = None


class ModerationRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)
