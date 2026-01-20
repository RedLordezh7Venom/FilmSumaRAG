from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "FilmSumaRAG"
    API_V1_STR: str = "/api/v1"
    
    # API Keys
    GROQ_KEY: str
    GOOGLE_API_KEY: Optional[str] = None
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@db:5432/filmsumarag"
    
    # Security
    SECRET_KEY: str = "9609590748102a1d94ad6897262c50543209848572dcb9345c206f3"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Redis / Celery
    REDIS_URL: str = "redis://redis:6379/0"
    CELERY_BROKER_URL: str = "redis://redis:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://redis:6379/0"

    # Vector DB
    CHROMA_DB_URL: str = "http://chromadb:8000"

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
        case_sensitive=False
    )

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()
