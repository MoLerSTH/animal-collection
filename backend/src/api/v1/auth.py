from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.core.config import settings
from src.schemas.auth import GoogleLoginRequest, TokenResponse, UserResponse, UserUpdateRequest, DeleteAccountRequest
from src.services.auth_service import verify_google_token, upsert_google_user, create_access_token
from src.api.deps import get_current_user
from src.models.user import User
from src.models.collection import UserCollection

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/google", response_model=TokenResponse)
def login_with_google(payload: GoogleLoginRequest, db: Session = Depends(get_db)):
    """
    Exchanges a Google ID Token for an Application JWT Session Token.
    Validates token signature with Google, then automatically registers or updates the user profile in PostgreSQL.
    """
    if not payload.id_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="id_token is required"
        )

    try:
        google_info = verify_google_token(payload.id_token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication error: {str(e)}"
        )

    # Upsert user record
    try:
        user = upsert_google_user(db, google_info)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database user persistence error: {str(e)}"
        )

    # Generate JWT
    access_token = create_access_token(user_id=str(user.id), email=user.email)

    return TokenResponse(
        user=UserResponse(
            id=str(user.id),
            email=user.email,
            name=user.name,
            avatarUrl=user.avatar_url,
            googleId=user.google_id
        ),
        accessToken=access_token,
        tokenType="Bearer"
    )


@router.get("/me", response_model=UserResponse)
def get_my_profile(current_user: User = Depends(get_current_user)):
    """
    Returns the currently authenticated user's profile from JWT token.
    """
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        name=current_user.name,
        avatarUrl=current_user.avatar_url,
        googleId=current_user.google_id
    )


@router.patch("/me", response_model=UserResponse)
def update_my_profile(
    payload: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates the currently authenticated user's profile username.
    """
    current_user.name = payload.name
    db.commit()
    db.refresh(current_user)
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        name=current_user.name,
        avatarUrl=current_user.avatar_url,
        googleId=current_user.google_id
    )


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_account(
    payload: DeleteAccountRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deletes the current user account and associated collection data upon confirmation.
    """
    if payload.confirmation != "DELETE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirmation 'DELETE' is required to delete account"
        )

    db.query(UserCollection).filter(UserCollection.user_id == current_user.id).delete()
    db.delete(current_user)
    db.commit()
    return None

@router.get("/health")
def auth_health():
    """
    Health check to verify auth service configuration.
    """
    return {
        "status": "healthy",
        "service": "auth",
        "googleClientIdConfigured": bool(settings.GOOGLE_WEB_CLIENT_ID),
        "clientIdPrefix": settings.GOOGLE_WEB_CLIENT_ID[:15] + "..." if settings.GOOGLE_WEB_CLIENT_ID else None
    }

