from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from src.core.config import settings
from src.core.database import engine, Base
from src.models import user  # ensure models are registered with Base
from src.api.v1 import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables if they don't exist
    try:
        Base.metadata.create_all(bind=engine)
        print("[Database] tables verified/created successfully.")
    except Exception as e:
        print(f"[Warning] Could not auto-create database tables on startup ({e}).")
    yield
    # Shutdown logic if any


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Backend API service for Animal Collection application (Google Auth, MinIO S3, PostgreSQL)",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

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
