from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import embed, health, match
from app.config import settings
from app.services.embedding_service import EmbeddingService


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncGenerator[None, None]:
    # Load ML model once at startup — not per-request
    await EmbeddingService.initialize(settings.MODEL_NAME, settings.MODEL_CACHE_DIR)
    yield
    await EmbeddingService.shutdown()


app = FastAPI(
    title="DreamCloud NLP Service",
    version="0.1.0",
    docs_url="/docs" if settings.APP_ENV != "production" else None,
    redoc_url=None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["POST", "GET"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(health.router, prefix="/internal", tags=["health"])
app.include_router(embed.router, prefix="/internal", tags=["embed"])
app.include_router(match.router, prefix="/internal", tags=["match"])
