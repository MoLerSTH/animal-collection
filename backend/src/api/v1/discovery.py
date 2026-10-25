from datetime import date, datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session

from src.core.config import settings
from src.core.database import get_db
from src.api.deps import get_current_user, get_optional_current_user
from src.models.user import User
from src.models.analysis_usage import UserAnalysisUsage
from src.schemas.discovery import AnimalIdentificationResponse, AnalysisUsageResponse
from src.services.ai_service import (
    ai_service,
    AIException,
    AIConfigurationError,
    AIRateLimitError,
    AIServiceUnavailableError,
    AIInvalidImageError,
)

router = APIRouter(prefix="/discovery", tags=["AI Discovery"])


def get_daily_reset_time() -> tuple[datetime, int]:
    """Returns the next midnight UTC datetime and seconds remaining until then."""
    now = datetime.now(timezone.utc)
    tomorrow = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    seconds_remaining = max(1, int((tomorrow - now).total_seconds()))
    return tomorrow, seconds_remaining


@router.get("/usage", response_model=AnalysisUsageResponse)
def get_analysis_usage(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Returns the daily AI analysis usage and remaining quota for the user.
    """
    limit = settings.AI_DAILY_QUOTA_PER_USER
    resets_at, _ = get_daily_reset_time()
    resets_at_str = resets_at.isoformat()

    if not current_user:
        return AnalysisUsageResponse(
            used=0,
            limit=limit,
            remaining=limit,
            resetsAt=resets_at_str,
        )

    today = date.today()
    record = (
        db.query(UserAnalysisUsage)
        .filter(
            UserAnalysisUsage.user_id == current_user.id,
            UserAnalysisUsage.usage_date == today,
        )
        .first()
    )
    used = record.count if record else 0
    remaining = max(0, limit - used)

    return AnalysisUsageResponse(
        used=used,
        limit=limit,
        remaining=remaining,
        resetsAt=resets_at_str,
    )


@router.post("/identify", response_model=AnimalIdentificationResponse)
async def identify_animal(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Analyzes an animal photograph using Google Gemini Multimodal AI.
    Returns identification, species, classification, habitat tags, and a story.
    """
    # 1. Quota check
    today = date.today()
    resets_at, seconds_remaining = get_daily_reset_time()
    resets_at_str = resets_at.isoformat()

    usage_record = (
        db.query(UserAnalysisUsage)
        .filter(
            UserAnalysisUsage.user_id == current_user.id,
            UserAnalysisUsage.usage_date == today,
        )
        .first()
    )
    used_today = usage_record.count if usage_record else 0

    if used_today >= settings.AI_DAILY_QUOTA_PER_USER:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "code": "user_daily_limit",
                "retryAfterSeconds": seconds_remaining,
                "resetsAt": resets_at_str,
            },
            headers={"Retry-After": str(seconds_remaining)},
        )

    # 2. File validation
    max_bytes = settings.AI_MAX_IMAGE_SIZE_MB * 1024 * 1024
    image_bytes = await file.read()

    if len(image_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The analysis service could not read this photo. Please take another photo.",
        )

    if len(image_bytes) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"This photo is too large to analyze. Maximum size is {settings.AI_MAX_IMAGE_SIZE_MB}MB.",
        )

    # 3. Call AI Service
    try:
        result = ai_service.identify_animal(image_bytes)
    except AIException as e:
        headers = {}
        if isinstance(e, AIRateLimitError):
            headers["Retry-After"] = str(e.retry_after)
            detail = {
                "code": e.code or "service_busy",
                "retryAfterSeconds": e.retry_after,
                "resetsAt": resets_at_str,
            }
        else:
            detail = e.message

        raise HTTPException(
            status_code=e.status_code,
            detail=detail,
            headers=headers if headers else None,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"The AI service is unavailable ({str(e)}). Please try again later.",
        )

    # 4. Increment usage quota on successful analysis
    try:
        if not usage_record:
            usage_record = UserAnalysisUsage(
                user_id=current_user.id,
                usage_date=today,
                count=1,
            )
            db.add(usage_record)
        else:
            usage_record.count += 1
        db.commit()
    except Exception:
        db.rollback()

    return AnimalIdentificationResponse(**result)
