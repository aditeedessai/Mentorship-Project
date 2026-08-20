from fastapi import APIRouter, HTTPException, status

from backend.api.schemas.performance import (
    PerformanceResponse,
    ResultResponse,
)
from backend.services.evaluation_service import (
    get_attempt_performance_summary,
)

router = APIRouter(tags=["Performance"])


@router.get(
    "/attempts/{attempt_id}/performance",
    response_model=PerformanceResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current performance for an attempt",
    description="Retrieves live section-wise, topic-wise, and cumulative performance for completed sections under an attempt."
)
def get_current_performance(attempt_id: str) -> PerformanceResponse:
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
def get_attempt_results(attempt_id: str) -> ResultResponse:
    try:
        summary = get_attempt_performance_summary(attempt_id)
        return ResultResponse(**summary)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

