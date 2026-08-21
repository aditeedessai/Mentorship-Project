import os
import requests
from dotenv import load_dotenv
from fastapi import Header, HTTPException, status
from pydantic import BaseModel, Field

load_dotenv()


class AuthenticatedUser(BaseModel):
    """
    Represents an authenticated Supabase user.
    """
    user_id: str = Field(..., description="The authenticated Supabase user UUID")
    email: str | None = Field(None, description="The user's email address if available")


def get_supabase_auth_config() -> tuple[str, str]:
    """
    Retrieves Supabase URL and API Key from environment variables.
    """
    url = os.getenv("SUPABASE_URL", "").rstrip("/")
    key = (
        os.getenv("SUPABASE_PUBLISHABLE_KEY")
        or os.getenv("SUPABASE_ANON_KEY")
        or os.getenv("SUPABASE_SECRET_KEY")
        or ""
    )
    return url, key


def get_current_user(
    authorization: str | None = Header(None, alias="Authorization")
) -> AuthenticatedUser:
    """
    FastAPI dependency that extracts and validates the Supabase JWT access token
    from the Authorization header (Authorization: Bearer <access_token>).

    Returns:
        AuthenticatedUser object containing user_id.

    Raises:
        HTTPException 401 Unauthorized for missing, malformed, invalid, or expired tokens.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"}
        )

    raw_header = authorization.strip()
    if not raw_header.lower().startswith("bearer"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication scheme. Expected 'Bearer <access_token>'",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = raw_header[6:].strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Empty bearer token",
            headers={"WWW-Authenticate": "Bearer"}
        )

    supabase_url, supabase_key = get_supabase_auth_config()
    if not supabase_url or not supabase_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase authentication configuration is missing"
        )

    # Validate token against Supabase Auth API (/auth/v1/user)
    try:
        response = requests.get(
            f"{supabase_url}/auth/v1/user",
            headers={
                "apikey": supabase_key,
                "Authorization": f"Bearer {token}"
            },
            timeout=10.0
        )
    except requests.RequestException as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Unable to reach Supabase authentication service: {str(e)}"
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"}
        )

    try:
        user_data = response.json()
        user_id = user_data.get("id")
        if not user_id:
            raise ValueError("No user ID found in Supabase auth response")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Failed to parse user data from authentication token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"}
        )

    return AuthenticatedUser(
        user_id=str(user_id),
        email=user_data.get("email")
    )
