from fastapi import APIRouter, status

try:
    from api.schemas.attempt import AttemptStatus
    from api.schemas.performance import (
        CumulativePerformance,
        PerformanceResponse,
        ResultResponse,
        SectionPerformance,
        TopicPerformance,
    )
except ModuleNotFoundError:
    from backend.api.schemas.attempt import AttemptStatus
    from backend.api.schemas.performance import (
        CumulativePerformance,
        PerformanceResponse,
        ResultResponse,
        SectionPerformance,
        TopicPerformance,
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
    mcq_sec = SectionPerformance(
        section_name="mcq",
        marks_obtained=10.0,
        maximum_marks=10.0,
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

    topic_gen = TopicPerformance(
        topic_name="general",
        marks_obtained=18.0,
        maximum_marks=20.0,
        percentage=90.0,
        remark="Excellent"
    )

    cumulative = CumulativePerformance(
        total_marks_obtained=18.0,
        total_maximum_marks=20.0,
        overall_percentage=90.0,
        overall_remark="Excellent",
        strongest_section="mcq",
        weakest_section="application"
    )

    return PerformanceResponse(
        attempt_id=attempt_id,
        sections=[mcq_sec, app_sec],
        cumulative=cumulative,
        topics=[topic_gen]
    )


@router.get(
    "/attempts/{attempt_id}/results",
    response_model=ResultResponse,
    status_code=status.HTTP_200_OK,
    summary="Get final test results for an attempt",
    description="Retrieves final performance summary, status, section breakdown, and topic breakdown upon completing a test attempt."
)
def get_attempt_results(attempt_id: str) -> ResultResponse:
    mcq_sec = SectionPerformance(
        section_name="mcq",
        marks_obtained=10.0,
        maximum_marks=10.0,
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
        marks_obtained=9.0,
        maximum_marks=10.0,
        percentage=90.0,
        remark="Excellent"
    )

    topic_gen = TopicPerformance(
        topic_name="general",
        marks_obtained=36.0,
        maximum_marks=40.0,
        percentage=90.0,
        remark="Excellent"
    )

    cumulative = CumulativePerformance(
        total_marks_obtained=36.0,
        total_maximum_marks=40.0,
        overall_percentage=90.0,
        overall_remark="Excellent",
        strongest_section="mcq",
        weakest_section="application"
    )

    return ResultResponse(
        attempt_id=attempt_id,
        status=AttemptStatus.COMPLETED,
        cumulative=cumulative,
        sections=[mcq_sec, app_sec, long_sec, short_sec],
        topics=[topic_gen]
    )
