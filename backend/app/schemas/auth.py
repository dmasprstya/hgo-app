from pydantic import BaseModel
from typing import Optional
from app.models.user import UserRole


class LoginRequest(BaseModel):
    email: str  # str not EmailStr — email-validator v2 rejects .local TLD
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    name: str
    email: str
    role: UserRole


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: UserRole

    model_config = {"from_attributes": True}
