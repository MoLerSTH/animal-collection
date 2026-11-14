import re
from pydantic import BaseModel, EmailStr, field_validator
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


class UserUpdateRequest(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        trimmed = v.strip()
        if len(trimmed) < 2 or len(trimmed) > 30:
            raise ValueError("Username must be between 2 and 30 characters.")
        if re.search(r"[\x00-\x1f\x7f]", trimmed):
            raise ValueError("Username cannot contain control characters or line breaks.")
        return trimmed


class DeleteAccountRequest(BaseModel):
    confirmation: str
