from pydantic import BaseModel


class EmbedResponse(BaseModel):
    dream_id: str
    vector: list[float]
    dimension: int


class DreamMatch(BaseModel):
    dream_id: str
    similarity_score: float
    rank: int


class MatchResponse(BaseModel):
    source_dream_id: str
    matches: list[DreamMatch]
    total: int


class ModerationResponse(BaseModel):
    is_safe: bool
    reason: str | None = None


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    version: str
