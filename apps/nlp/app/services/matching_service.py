from __future__ import annotations

from app.services.embedding_service import EmbeddingService


class MatchingService:
    @classmethod
    async def find_matches(
        cls,
        content: str,
        limit: int = 20,
        exclude_user_id: str | None = None,
    ) -> list[dict[str, object]]:
        _vector = await EmbeddingService.embed(content)
        # TODO: Sprint 3 — pgvector cosine similarity query via asyncpg
        return []
