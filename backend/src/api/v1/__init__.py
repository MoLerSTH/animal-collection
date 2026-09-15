from fastapi import APIRouter
from src.api.v1.auth import router as auth_router
from src.api.v1.animals import router as animals_router
from src.api.v1.collections import router as collections_router
from src.api.v1.storage import router as storage_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_router)
api_router.include_router(animals_router)
api_router.include_router(collections_router)
api_router.include_router(storage_router)


