from pydantic import BaseModel, EmailStr
from typing import Optional
from app.models.user import UserRole


class LoginRequest(BaseModel):
    email: EmailStr
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
