from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from src.core.config import settings
from src.core.database import engine, Base, SessionLocal
from src.models import user, animal, collection  # ensure models are registered with Base
from src.db.seeds import seed_catalog_animals
from src.services.storage_service import storage_service
from src.api.v1 import api_router


def ensure_schema_columns(target_engine):
    try:
        from sqlalchemy import inspect, text
        inspector = inspect(target_engine)
        table_names = inspector.get_table_names()
        if "users" in table_names:
            user_cols = {c["name"] for c in inspector.get_columns("users")}
            with target_engine.connect() as conn:
                if "starter_gift_status" not in user_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN starter_gift_status VARCHAR(20) DEFAULT 'available' NOT NULL"))
                    conn.commit()
        if "user_collections" in table_names:
            coll_cols = {c["name"] for c in inspector.get_columns("user_collections")}
            with target_engine.connect() as conn:
                if "source" not in coll_cols:
                    conn.execute(text("ALTER TABLE user_collections ADD COLUMN source VARCHAR(30) DEFAULT 'capture' NOT NULL"))
                if "identified_species" not in coll_cols:
                    conn.execute(text("ALTER TABLE user_collections ADD COLUMN identified_species VARCHAR(100)"))
                if "animal_type" not in coll_cols:
                    conn.execute(text("ALTER TABLE user_collections ADD COLUMN animal_type VARCHAR(50) DEFAULT 'Unknown'"))
                if "habitat_tags" not in coll_cols:
                    conn.execute(text("ALTER TABLE user_collections ADD COLUMN habitat_tags TEXT DEFAULT '[]'"))
                if "client_request_id" not in coll_cols:
                    conn.execute(text("ALTER TABLE user_collections ADD COLUMN client_request_id VARCHAR(64)"))
                conn.commit()
    except Exception as e:
        print(f"[Warning] ensure_schema_columns check: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables if they don't exist
    try:
        Base.metadata.create_all(bind=engine)
        ensure_schema_columns(engine)
        print("[Database] tables verified/created successfully.")
    except Exception as e:
        print(f"[Warning] Could not auto-create database tables on startup ({e}).")

    # Ensure MinIO / S3 storage bucket exists
    try:
        storage_service.ensure_bucket_exists()
    except Exception as e:
        print(f"[Warning] Could not initialize storage bucket ({e}).")

    # Seed master animal catalog
    try:
        db = SessionLocal()
        try:
            seed_catalog_animals(db)
        finally:
            db.close()
    except Exception as e:
        print(f"[Warning] Could not auto-seed animal catalog ({e}).")

    yield
    # Shutdown logic if any


is_production = settings.ENVIRONMENT == "production"

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Backend API service for Animal Collection application (Google Auth, MinIO S3, PostgreSQL)",
    lifespan=lifespan,
    docs_url=None if is_production else "/docs",
    redoc_url=None if is_production else "/redoc",
    openapi_url=None if is_production else "/openapi.json",
)

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    if is_production:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(api_router)


@app.get("/")
def root():
    return {
        "message": "Animal Collection API is running",
        "docs": "/docs",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}
