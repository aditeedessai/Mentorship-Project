from fastapi import APIRouter, HTTPException, status

try:
    from api.routes.attempts import ATTEMPTS_STORE
    from api.schemas.attempt import AttemptStatus
    from api.schemas.performance import (
        CumulativePerformance,
        PerformanceResponse,
        ResultResponse,
        SectionPerformance,
        TopicPerformance,
    )
    from mock_data.performance import MOCK_PERFORMANCE, MOCK_RESULTS
except ModuleNotFoundError:
    from backend.api.routes.attempts import ATTEMPTS_STORE
    from backend.api.schemas.attempt import AttemptStatus
    from backend.api.schemas.performance import (
        CumulativePerformance,
        PerformanceResponse,
        ResultResponse,
        SectionPerformance,
        TopicPerformance,
    )
    from backend.mock_data.performance import MOCK_PERFORMANCE, MOCK_RESULTS

router = APIRouter(tags=["Performance"])


@router.get(
    "/attempts/{attempt_id}/performance",
    response_model=PerformanceResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current performance for an attempt",
    description="Retrieves live section-wise, topic-wise, and cumulative performance for completed sections under an attempt."
)
def get_current_performance(attempt_id: str) -> PerformanceResponse:
    if attempt_id not in ATTEMPTS_STORE:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attempt with ID '{attempt_id}' not found"
        )

    if attempt_id in MOCK_PERFORMANCE:
        return MOCK_PERFORMANCE[attempt_id]

    # Dynamic mock performance for new in-progress attempts.
    # Only completed question-type sections (MCQ, Application) are included.
    # Incomplete sections (Long, Short) are excluded from cumulative calculations.
    mcq_sec = SectionPerformance(
        section_name="mcq",
        marks_obtained=2.0,
        maximum_marks=2.0,
        percentage=100.0,
        remark="Excellent"
    )
    app_sec = SectionPerformance(
        section_name="application",
        marks_obtained=8.0,
        maximum_marks=10.0,
        percentage=80.0,
        remark="Very Good"
    )

    topic_proc = TopicPerformance(
        topic_name="process_scheduling",
        marks_obtained=2.0,
        maximum_marks=2.0,
        percentage=100.0,
        remark="Excellent"
    )
    topic_deadlock = TopicPerformance(
        topic_name="deadlock_prevention",
        marks_obtained=8.0,
        maximum_marks=10.0,
        percentage=80.0,
        remark="Very Good"
    )

    cumulative = CumulativePerformance(
        total_marks_obtained=10.0,
        total_maximum_marks=12.0,
        overall_percentage=83.33,
        overall_remark="Very Good",
        strongest_section="mcq",
        weakest_section="application"
    )

    return PerformanceResponse(
        attempt_id=attempt_id,
        sections=[mcq_sec, app_sec],
        cumulative=cumulative,
        topics=[topic_proc, topic_deadlock]
    )


@router.get(
    "/attempts/{attempt_id}/results",
    response_model=ResultResponse,
    status_code=status.HTTP_200_OK,
    summary="Get final test results for an attempt",
    description="Retrieves final performance summary, status, section breakdown, and topic breakdown upon completing a test attempt."
)
def get_attempt_results(attempt_id: str) -> ResultResponse:
    if attempt_id not in ATTEMPTS_STORE:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attempt with ID '{attempt_id}' not found"
        )

    if attempt_id in MOCK_RESULTS:
        return MOCK_RESULTS[attempt_id]

    attempt = ATTEMPTS_STORE[attempt_id]

    mcq_sec = SectionPerformance(
        section_name="mcq",
        marks_obtained=2.0,
        maximum_marks=2.0,
        percentage=100.0,
        remark="Excellent"
    )
    app_sec = SectionPerformance(
        section_name="application",
        marks_obtained=8.0,
        maximum_marks=10.0,
        percentage=80.0,
        remark="Very Good"
    )
    long_sec = SectionPerformance(
        section_name="long",
        marks_obtained=9.0,
        maximum_marks=10.0,
        percentage=90.0,
        remark="Excellent"
    )
    short_sec = SectionPerformance(
        section_name="short",
        marks_obtained=4.0,
        maximum_marks=5.0,
        percentage=80.0,
        remark="Very Good"
    )

    topic_proc = TopicPerformance(
        topic_name="process_scheduling",
        marks_obtained=2.0,
        maximum_marks=2.0,
        percentage=100.0,
        remark="Excellent"
    )
    topic_deadlock = TopicPerformance(
        topic_name="deadlock_prevention",
        marks_obtained=8.0,
        maximum_marks=10.0,
        percentage=80.0,
        remark="Very Good"
    )

    cumulative = CumulativePerformance(
        total_marks_obtained=23.0,
        total_maximum_marks=27.0,
        overall_percentage=85.19,
        overall_remark="Very Good",
        strongest_section="mcq",
        weakest_section="application"
    )

    return ResultResponse(
        attempt_id=attempt_id,
        status=attempt.status,
        cumulative=cumulative,
        sections=[mcq_sec, app_sec, long_sec, short_sec],
        topics=[topic_proc, topic_deadlock]
    )

