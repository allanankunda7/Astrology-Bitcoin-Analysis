"""
Core application configuration using Pydantic Settings.
Loads environment variables safely without hardcoded secrets.
"""
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "Quantitative Market Analysis & Trading Research Terminal"
    API_V1_STR: str = "/api/v1"
    VERSION: str = "1.0.0"
    
    # Security & JWT
    SECRET_KEY: str = "changethis-in-production-use-a-strong-random-key-32chars"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    ALGORITHM: str = "HS256"
    
    # CORS Configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*"
    ]
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/trading_research"
    DATABASE_SYNC_URL: str = "postgresql://postgres:postgres@localhost:5432/trading_research"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
