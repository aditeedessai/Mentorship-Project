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

MOCK_PERFORMANCE: dict[str, PerformanceResponse] = {
    "attempt-001": PerformanceResponse(
        attempt_id="attempt-001",
        sections=[
            SectionPerformance(
                section_name="mcq",
                marks_obtained=2.0,
                maximum_marks=2.0,
                percentage=100.0,
                remark="Excellent",
            ),
            SectionPerformance(
                section_name="short",
                marks_obtained=4.0,
                maximum_marks=5.0,
                percentage=80.0,
                remark="Very Good",
            ),
        ],
        cumulative=CumulativePerformance(
            total_marks_obtained=6.0,
            total_maximum_marks=7.0,
            overall_percentage=85.71,
            overall_remark="Very Good",
            strongest_section="mcq",
            weakest_section="short",
        ),
        topics=[
            TopicPerformance(
                topic_name="process_scheduling",
                marks_obtained=2.0,
                maximum_marks=2.0,
                percentage=100.0,
                remark="Excellent",
            ),
            TopicPerformance(
                topic_name="concurrency",
                marks_obtained=4.0,
                maximum_marks=5.0,
                percentage=80.0,
                remark="Very Good",
            ),
        ],
    ),
}

MOCK_RESULTS: dict[str, ResultResponse] = {
    "attempt-002": ResultResponse(
        attempt_id="attempt-002",
        status=AttemptStatus.COMPLETED,
        cumulative=CumulativePerformance(
            total_marks_obtained=23.0,
            total_maximum_marks=27.0,
            overall_percentage=85.19,
            overall_remark="Very Good",
            strongest_section="mcq",
            weakest_section="application",
        ),
        sections=[
            SectionPerformance(
                section_name="mcq",
                marks_obtained=2.0,
                maximum_marks=2.0,
                percentage=100.0,
                remark="Excellent",
            ),
            SectionPerformance(
                section_name="short",
                marks_obtained=4.0,
                maximum_marks=5.0,
                percentage=80.0,
                remark="Very Good",
            ),
            SectionPerformance(
                section_name="application",
                marks_obtained=8.0,
                maximum_marks=10.0,
                percentage=80.0,
                remark="Very Good",
            ),
            SectionPerformance(
                section_name="long",
                marks_obtained=9.0,
                maximum_marks=10.0,
                percentage=90.0,
                remark="Excellent",
            ),
        ],
        topics=[
            TopicPerformance(
                topic_name="process_scheduling",
                marks_obtained=2.0,
                maximum_marks=2.0,
                percentage=100.0,
                remark="Excellent",
            ),
            TopicPerformance(
                topic_name="deadlock_prevention",
                marks_obtained=8.0,
                maximum_marks=10.0,
                percentage=80.0,
                remark="Very Good",
            ),
            TopicPerformance(
                topic_name="virtual_memory",
                marks_obtained=9.0,
                maximum_marks=10.0,
                percentage=90.0,
                remark="Excellent",
            ),
            TopicPerformance(
                topic_name="concurrency",
                marks_obtained=4.0,
                maximum_marks=5.0,
                percentage=80.0,
                remark="Very Good",
            ),
        ],
    ),
}
