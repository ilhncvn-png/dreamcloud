from __future__ import annotations

import asyncio
from typing import ClassVar

import numpy as np


class EmbeddingService:
    _model: ClassVar[object | None] = None
    _ready: ClassVar[bool] = False

    @classmethod
    async def initialize(cls, model_name: str, cache_dir: str) -> None:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, cls._load_model, model_name, cache_dir)
        cls._ready = True

    @classmethod
    def _load_model(cls, model_name: str, cache_dir: str) -> None:
        from sentence_transformers import SentenceTransformer
        cls._model = SentenceTransformer(model_name, cache_folder=cache_dir)

    @classmethod
    async def embed(cls, text: str) -> list[float]:
        if cls._model is None:
            raise RuntimeError("Model not initialized")
        loop = asyncio.get_event_loop()
        vector: np.ndarray = await loop.run_in_executor(None, cls._model.encode, text)
        return vector.tolist()

    @classmethod
    def is_ready(cls) -> bool:
        return cls._ready

    @classmethod
    async def shutdown(cls) -> None:
        cls._model = None
        cls._ready = False
