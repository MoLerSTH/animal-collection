import jwt
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

from src.core.config import settings
from src.models.user import User


def verify_google_token(token_str: str) -> Dict[str, Any]:
    """
    Verifies Google ID Token via Google's official public keys.
    In development mode, supports mock tokens starting with 'mock_' for rapid offline testing.
    """
    # 1. Dev / Mock token support
    if settings.ENVIRONMENT == "development" and token_str.startswith("mock_"):
        return {
            "sub": f"mock_google_sub_{hash(token_str) % 1000000}",
            "email": "jane.doe@animalcollection.dev",
            "name": "Jane Doe (Dev)",
            "picture": "https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=200&auto=format&fit=crop",
        }

    # 2. Real Google verification
    try:
        id_info = google_id_token.verify_oauth2_token(
            token_str,
            google_requests.Request(),
            settings.GOOGLE_WEB_CLIENT_ID,
            clock_skew_in_seconds=10
        )
        return id_info
    except ValueError as e:
        raise ValueError(f"Invalid Google ID Token: {str(e)}")


def upsert_google_user(db: Session, google_info: Dict[str, Any]) -> User:
    """
    Finds or creates a user based on google_id or email, then updates latest profile info.
    """
    google_id = google_info.get("sub")
    email = google_info.get("email")
    name = google_info.get("name") or email.split("@")[0]
    avatar_url = google_info.get("picture")

    if not google_id or not email:
        raise ValueError("Google user payload missing sub or email")

    user = db.query(User).filter(
        (User.google_id == google_id) | (User.email == email)
    ).first()

    if user:
        # Update existing user profile
        user.name = name
        if avatar_url:
            user.avatar_url = avatar_url
        if not user.google_id:
            user.google_id = google_id
    else:
        # Create new user
        user = User(
            google_id=google_id,
            email=email,
            name=name,
            avatar_url=avatar_url
        )
        db.add(user)

    db.commit()
    db.refresh(user)
    return user


def create_access_token(user_id: str, email: str, expires_delta: Optional[timedelta] = None) -> str:
    """
    Generates a secure signed JWT Access Token for the app session.
    """
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode = {
        "sub": str(user_id),
        "email": email,
        "exp": expire,
        "iat": now,
    }
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decodes and validates an application JWT token.
    """
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None
