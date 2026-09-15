from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends
from fastapi.responses import StreamingResponse
from typing import Optional
from src.services.storage_service import storage_service
from src.schemas.collection import PhotoUploadResponse
from src.api.deps import get_current_user
from src.models.user import User

router = APIRouter(prefix="/storage", tags=["Storage & Photos"])


@router.post("/upload", response_model=PhotoUploadResponse)
async def upload_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """
    Uploads a photo to MinIO / S3 storage (or local fallback).
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be an image (JPEG, PNG, WEBP)",
        )

    file_bytes = await file.read()
    if len(file_bytes) > 20 * 1024 * 1024:  # 20MB limit
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds maximum allowed (20MB)",
        )

    ext = "jpg"
    if file.filename and "." in file.filename:
        ext = file.filename.rsplit(".", 1)[1].lower()

    photo_url = storage_service.upload_photo(
        file_bytes=file_bytes,
        content_type=file.content_type or "image/jpeg",
        user_id=str(current_user.id),
        extension=ext,
    )

    return PhotoUploadResponse(
        photoUrl=photo_url,
        fileName=photo_url.split("/")[-1],
        fileSize=len(file_bytes),
        contentType=file.content_type or "image/jpeg",
    )


@router.get("/photos/{object_name}")
def get_photo(object_name: str):
    """
    Streams animal photo from S3 storage or local disk.
    Allows React Native clients to safely view uploaded images across emulator/device.
    """
    result = storage_service.get_photo_file(object_name)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found",
        )

    stream, content_type = result
    return StreamingResponse(
        stream,
        media_type=content_type,
        headers={
            "Cache-Control": "public, max-age=604800, immutable",
        },
    )

