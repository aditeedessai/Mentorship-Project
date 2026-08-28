from fastapi import APIRouter, Depends, HTTPException, Query, status

from backend.api.deps import AuthenticatedUser, get_current_user
from backend.api.schemas.activity import StudiedDaysResponse
from backend.database import evaluation_repository

router = APIRouter(prefix="/activity", tags=["Activity"])


@router.get(
    "/studied-days",
    response_model=StudiedDaysResponse,
    status_code=status.HTTP_200_OK,
    summary="List studied days for a month",
    description="Retrieves the distinct days within the given month/year the authenticated user answered at least one question, across every study set and question type."
)
def get_studied_days(
    year: int = Query(..., ge=2000, le=2100, description="Calendar year, e.g. 2026"),
    month: int = Query(..., ge=1, le=12, description="Calendar month (1-12)"),
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> StudiedDaysResponse:
    try:
        studied_days = evaluation_repository.get_studied_dates(
            user_id=current_user.user_id,
            year=year,
            month=month
        )
        return StudiedDaysResponse(year=year, month=month, studied_days=studied_days)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get studied days: {str(e)}"
        )
