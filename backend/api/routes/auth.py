from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, EmailStr, Field

from backend.api.rate_limiter import rate_limit_by_ip

router = APIRouter(prefix="/auth", tags=["Auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


class SignUpRequest(BaseModel):
    email: str
    password: str


class PasswordResetRequest(BaseModel):
    email: str


@router.post(
    "/login",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(rate_limit_by_ip(10, 300, scope="login"))],
    summary="User login endpoint",
    description="Rate-limited unauthenticated endpoint for user login (10 requests / 5 minutes / IP)."
)
def login(payload: LoginRequest):
    return {"message": "Login request accepted"}


@router.post(
    "/signup",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit_by_ip(5, 900, scope="signup"))],
    summary="User sign up endpoint",
    description="Rate-limited unauthenticated endpoint for user sign up (5 requests / 15 minutes / IP)."
)
def signup(payload: SignUpRequest):
    return {"message": "Sign up request accepted"}


@router.post(
    "/password-reset",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(rate_limit_by_ip(5, 900, scope="password_reset"))],
    summary="Password reset request endpoint",
    description="Rate-limited unauthenticated endpoint for password reset (5 requests / 15 minutes / IP)."
)
def password_reset(payload: PasswordResetRequest):
    return {"message": "Password reset request accepted"}
