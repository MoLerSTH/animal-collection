import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from src.core.database import get_db
from src.services.auth_service import decode_access_token, decode_access_token_with_reason
from src.models.user import User

logger = logging.getLogger("uvicorn.error")
security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    payload, failure_reason = decode_access_token_with_reason(token)
    
    if not payload:
        token_prefix = f"{token[:12]}..." if token else "empty"
        logger.warning(f"[Auth Failure] 401 Unauthorized: reason={failure_reason} | token_prefix={token_prefix}")
        error_detail = "Authentication token has expired" if failure_reason == "token_expired" else "Invalid or expired authentication token"
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error_detail,
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if not user_id:
        logger.warning("[Auth Failure] 401 Unauthorized: token payload missing 'sub'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload invalid",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        logger.warning(f"[Auth Failure] 401 Unauthorized: user_id={user_id} not found in database (session expired or DB reset)")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User session expired or not found. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


security_optional = HTTPBearer(auto_error=False)


def get_optional_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_optional),
    db: Session = Depends(get_db),
) -> User | None:
    if not credentials or not credentials.credentials:
        return None
    try:
        payload = decode_access_token(credentials.credentials)
        if not payload or not payload.get("sub"):
            return None
        return db.query(User).filter(User.id == payload.get("sub")).first()
    except Exception:
        return None
