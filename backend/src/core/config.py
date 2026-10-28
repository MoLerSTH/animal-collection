import json
from typing import List, Union
from pydantic import model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    PROJECT_NAME: str = "Animal Collection Backend"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres123@localhost:5432/animal_db"

    # JWT
    JWT_SECRET: str = "animal_collection_super_secret_jwt_key_2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    # Google Auth
    GOOGLE_WEB_CLIENT_ID: str = ""

    # MinIO / S3
    S3_ENDPOINT: str = "http://localhost:9000"
    S3_ACCESS_KEY: str = "admin"
    S3_SECRET_KEY: str = "password123"
    S3_BUCKET_NAME: str = "animal-photos"

    # Gemini AI
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-flash-lite-latest"
    AI_WEEKLY_QUOTA_PER_USER: int = 7
    AI_DAILY_QUOTA_PER_USER: int = 7
    AI_MAX_IMAGE_SIZE_MB: int = 10

    # CORS
    CORS_ORIGINS: Union[str, List[str]] = "*"

    @property
    def cors_origins_list(self) -> List[str]:
        if isinstance(self.CORS_ORIGINS, str):
            if self.CORS_ORIGINS == "*":
                return ["*"]
            try:
                return json.loads(self.CORS_ORIGINS)
            except Exception:
                return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
        return self.CORS_ORIGINS

    @model_validator(mode="after")
    def validate_production_settings(self):
        if self.ENVIRONMENT == "production":
            self.DEBUG = False
            if self.JWT_SECRET == "animal_collection_super_secret_jwt_key_2026":
                raise ValueError("CRITICAL SECURITY ERROR: Default JWT_SECRET cannot be used in production! Generate a secure key via `openssl rand -hex 32`.")
            if self.CORS_ORIGINS == "*":
                import logging
                logging.warning("[SECURITY WARNING] CORS_ORIGINS is set to '*' in production. Please restrict to specific app domains.")
        return self

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
