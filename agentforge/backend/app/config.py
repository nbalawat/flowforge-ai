"""Application configuration."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment."""

    app_name: str = "AgentForge"
    debug: bool = True

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/agentforge"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Storage
    storage_path: str = "./generated"

    # Anthropic (for AI Copilot)
    anthropic_api_key: str = ""

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
