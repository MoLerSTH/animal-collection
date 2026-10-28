from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from src.core.config import settings
from src.core.database import engine, Base, SessionLocal
from src.models import user, animal, collection  # ensure models are registered with Base
from src.db.seeds import seed_catalog_animals
from src.services.storage_service import storage_service
from src.api.v1 import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables if they don't exist
    try:
        Base.metadata.create_all(bind=engine)
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
