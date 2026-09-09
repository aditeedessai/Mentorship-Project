import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status

from backend.api.deps import AuthenticatedUser, get_current_user
from backend.api.schemas.progress import ProgressHistoryResponse
from backend.services.progress_service import get_study_set_attempt_history

router = APIRouter(prefix="/progress", tags=["Progress"])


@router.get(
    "/history",
    response_model=ProgressHistoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get attempt performance history for a study set",
    description="Retrieves chronological performance breakdown (Attempt 1 to Attempt 4) across question types ('mcq', 'short', 'application', 'long') for a selected study set."
)
def get_progress_history(
    study_set_id: uuid.UUID = Query(..., description="UUID of the selected study set"),
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> ProgressHistoryResponse:
    result = get_study_set_attempt_history(
        user_id=current_user.user_id,
        study_set_id=str(study_set_id)
    )
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Study set with ID '{study_set_id}' not found or access denied."
        )
    return ProgressHistoryResponse(**result)
