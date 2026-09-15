from pydantic_settings import BaseSettings
from typing import List, Union
import json


class Settings(BaseSettings):
    PROJECT_NAME: str = "Animal Collection API"
    ENVIRONMENT: str = "development"
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres123@postgres:5432/animal_db"

    # Google OAuth
    GOOGLE_WEB_CLIENT_ID: str = "520693286792-2jv9gk463vfm37rvpvpjgg76dm3b17lh.apps.googleusercontent.com"

    # JWT Authentication
    JWT_SECRET: str = "animal_collection_super_secret_jwt_key_2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    # MinIO / S3 Storage
    S3_ENDPOINT: str = "http://minio:9000"
    S3_ACCESS_KEY: str = "admin"
    S3_SECRET_KEY: str = "password123"
    S3_BUCKET_NAME: str = "animal-photos"

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

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()

