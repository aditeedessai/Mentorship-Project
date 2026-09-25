import os
import time
import requests
from pathlib import Path
from dotenv import load_dotenv
from fastapi import Header, HTTPException, status
from pydantic import BaseModel, Field

BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")


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
        HTTPException 401 Unauthorized for missing, malformed,
        invalid, or expired tokens.

        HTTPException 503 when Supabase authentication
        cannot be reached after retry attempts.
    """

    # Check if Authorization header exists
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Clean the Authorization header
    raw_header = authorization.strip()

    # Validate authentication scheme
    if not raw_header.lower().startswith("bearer"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication scheme. Expected 'Bearer <access_token>'",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Extract token
    token = raw_header[6:].strip()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Empty bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get Supabase configuration
    supabase_url, supabase_key = get_supabase_auth_config()

    if not supabase_url or not supabase_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase authentication configuration is missing",
        )

    # Validate token against Supabase Auth API.
    #
    # Temporary SSL/network failures can occur while connecting to Supabase.
    # Retry the request up to 3 times before returning a 503 error.
    response = None
    last_error = None

    for attempt in range(3):
        try:
            response = requests.get(
                f"{supabase_url}/auth/v1/user",
                headers={
                    "apikey": supabase_key,
                    "Authorization": f"Bearer {token}",
                },
                timeout=10.0,
            )

            # If Supabase responds, do not retry.
            # A 401/403/etc. is an authentication response,
            # not a temporary network failure.
            break

        except requests.RequestException as error:
            last_error = error

            # Wait briefly before retrying
            if attempt < 2:
                time.sleep(0.5)

    # Supabase could not be reached after all retry attempts
    if response is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to reach Supabase authentication service. Please try again.",
        )

    # Token is invalid or expired
    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Parse Supabase user information
    try:
        user_data = response.json()
        user_id = user_data.get("id")

        if not user_id:
            raise ValueError("No user ID found in Supabase auth response")

    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Failed to parse user data from authentication token: {str(error)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Return authenticated user
    return AuthenticatedUser(
        user_id=str(user_id),
        email=user_data.get("email"),
    )