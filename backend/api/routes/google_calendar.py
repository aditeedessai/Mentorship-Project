"""
API routes for Google Calendar integration.

Provides endpoints for:
- Starting the OAuth flow (GET /connect)
- Handling the OAuth callback (GET /callback)
- Checking connection status (GET /status)
- Disconnecting (DELETE /disconnect)
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse

from backend.api.deps import AuthenticatedUser, get_current_user
from backend.api.rate_limiter import rate_limit_by_ip, rate_limit_by_user
from backend.services import google_calendar_service

router = APIRouter(prefix="/google-calendar", tags=["Google Calendar"])


@router.get(
    "/connect",
    status_code=status.HTTP_200_OK,
    summary="Start Google Calendar OAuth flow",
    description=(
        "Returns the Google OAuth 2.0 authorization URL.  The frontend "
        "should navigate the browser to this URL."
    ),
)
def connect_google_calendar(
    current_user: AuthenticatedUser = Depends(rate_limit_by_user(300, 60, scope="calendar_reads")),
) -> dict:
    auth_url = google_calendar_service.generate_auth_url(current_user.user_id)
    return {"auth_url": auth_url}


@router.get(
    "/callback",
    status_code=status.HTTP_302_FOUND,
    dependencies=[Depends(rate_limit_by_ip(10, 300, scope="google_callback"))],
    summary="Google OAuth 2.0 callback",
    description=(
        "Receives the authorization code from Google, exchanges it for "
        "tokens, saves the connection, runs initial sync, and redirects "
        "the user back to the frontend."
    ),
)
def google_calendar_callback(
    code: str = Query(None, description="Authorization code from Google"),
    state: str = Query(None, description="OAuth state parameter"),
    error: str = Query(None, description="Error code if the user denied access"),
):
    frontend_url = google_calendar_service.FRONTEND_URL
    print(f"[GCAL CALLBACK] code={'present' if code else 'MISSING'}, state={'present' if state else 'MISSING'}, error={error}")

    # If the user denied access, redirect gracefully
    if error:
        print(f"[GCAL CALLBACK] User denied access: {error}")
        return RedirectResponse(url=f"{frontend_url}?gcal_error=access_denied")

    if not code or not state:
        print(f"[GCAL CALLBACK] Missing params - code={bool(code)}, state={bool(state)}")
        return RedirectResponse(url=f"{frontend_url}?gcal_error=missing_params")

    user_id, error_msg = google_calendar_service.exchange_code(code, state)
    print(f"[GCAL CALLBACK] exchange_code result: user_id={user_id}, error_msg={error_msg}")

    if error_msg:
        return RedirectResponse(url=f"{frontend_url}?gcal_error={error_msg}")

    return RedirectResponse(url=f"{frontend_url}?gcal_connected=true")


@router.get(
    "/status",
    status_code=status.HTTP_200_OK,
    summary="Check Google Calendar connection status",
    description=(
        "Returns whether the current user has an active Google Calendar "
        "connection.  Never returns tokens."
    ),
)
def get_connection_status(
    current_user: AuthenticatedUser = Depends(rate_limit_by_user(300, 60, scope="calendar_reads")),
) -> dict:
    return google_calendar_service.get_connection_status(current_user.user_id)


@router.delete(
    "/disconnect",
    status_code=status.HTTP_200_OK,
    summary="Disconnect Google Calendar",
    description=(
        "Revokes the Google Calendar connection and removes stored "
        "credentials and event mappings.  Does NOT delete Jot tasks or exams."
    ),
)
def disconnect_google_calendar(
    current_user: AuthenticatedUser = Depends(rate_limit_by_user(60, 600, scope="calendar_writes")),
) -> dict:
    google_calendar_service.disconnect(current_user.user_id)
    return {"message": "Google Calendar disconnected successfully"}
