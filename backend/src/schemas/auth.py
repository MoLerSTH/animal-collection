from pydantic import BaseModel, EmailStr
from typing import Optional


class GoogleLoginRequest(BaseModel):
    id_token: str


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    name: str
    avatarUrl: Optional[str] = None
    googleId: Optional[str] = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    user: UserResponse
    accessToken: str
    tokenType: str = "Bearer"

