import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from backend.api.deps import AuthenticatedUser, get_current_user
from backend.api.schemas.performance import (
    PerformanceResponse,
    ResultResponse,
    StudySetResultsSummaryResponse,
)
from backend.database import study_set_repository
from backend.database.attempt_repository import get_attempt
from backend.services.evaluation_service import (
    get_attempt_performance_summary,
    get_study_set_results_summary,
)

router = APIRouter(tags=["Performance"])


@router.get(
    "/attempts/{attempt_id}/performance",
    response_model=PerformanceResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current performance for an attempt",
    description="Retrieves live section-wise, topic-wise, and cumulative performance for completed sections under an attempt."
)
def get_current_performance(
    attempt_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> PerformanceResponse:
    # Verify attempt ownership through relationship: user_id -> study_set -> quiz_attempt
    att = get_attempt(attempt_id, user_id=current_user.user_id)
    if not att:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attempt with ID '{attempt_id}' not found"
        )

    try:
        summary = get_attempt_performance_summary(attempt_id)
        return PerformanceResponse(**summary)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get(
    "/attempts/{attempt_id}/results",
    response_model=ResultResponse,
    status_code=status.HTTP_200_OK,
    summary="Get final test results for an attempt",
    description="Retrieves final performance summary, status, section breakdown, and topic breakdown upon completing a test attempt."
)
def get_attempt_results(
    attempt_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> ResultResponse:
    # Verify attempt ownership through relationship: user_id -> study_set -> quiz_attempt
    att = get_attempt(attempt_id, user_id=current_user.user_id)
    if not att:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attempt with ID '{attempt_id}' not found"
        )

    try:
        summary = get_attempt_performance_summary(attempt_id)
        return ResultResponse(**summary)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get(
    "/study-sets/{study_set_id}/results-summary",
    response_model=StudySetResultsSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get cumulative cross-attempt results for a study set",
    description=(
        "Retrieves cumulative, cross-attempt performance per question type "
        "for a study set - every attempt of a type rolled into one summary "
        "row, not just the most recent. Backs the study set's 'View "
        "Results' entry point, which has no single attempt_id to scope to."
    )
)
def get_study_set_results(
    study_set_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> StudySetResultsSummaryResponse:
    study_set_id_str = str(study_set_id)

    study_set = study_set_repository.get_study_set(study_set_id_str, user_id=current_user.user_id)
    if not study_set:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Study set with ID '{study_set_id}' not found"
        )

    summary = get_study_set_results_summary(study_set_id_str)
    return StudySetResultsSummaryResponse(**summary)

