from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_ENV: str = "development"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    LOG_LEVEL: str = "info"

    DATABASE_URL: str
    DATABASE_POOL_SIZE: int = 5

    REDIS_URL: str = "redis://localhost:6379"
    REDIS_PREFIX: str = "dreamcloud:nlp:"

    MODEL_NAME: str = "sentence-transformers/all-MiniLM-L6-v2"
    MODEL_CACHE_DIR: str = "./models"
    VECTOR_DIMENSION: int = 384
    MATCH_SIMILARITY_THRESHOLD: float = 0.65
    MATCH_LIMIT: int = 20

    INTERNAL_API_KEY: str = "dev-internal-key-change-in-production"

    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"


settings = Settings()
