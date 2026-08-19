from datetime import datetime, timezone

try:
    from api.schemas.answer import EvaluationListResponse, EvaluationResponse
    from api.schemas.attempt import AttemptListResponse, AttemptResponse, AttemptStatus
    from mock_data.documents import DOC_1_ID
    from mock_data.study_sets import STUDY_SET_1_ID
except ModuleNotFoundError:
    from backend.api.schemas.answer import EvaluationListResponse, EvaluationResponse
    from backend.api.schemas.attempt import AttemptListResponse, AttemptResponse, AttemptStatus
    from backend.mock_data.documents import DOC_1_ID
    from backend.mock_data.study_sets import STUDY_SET_1_ID

MOCK_ATTEMPTS: list[AttemptResponse] = [
    AttemptResponse(
        attempt_id="attempt-001",
        study_set_id=STUDY_SET_1_ID,
        document_id=DOC_1_ID,
        status=AttemptStatus.IN_PROGRESS,
        total_marks=29.0,
        marks_awarded=24.0,
        created_at=datetime(2026, 8, 19, 9, 0, 0, tzinfo=timezone.utc),
        updated_at=datetime(2026, 8, 19, 9, 15, 0, tzinfo=timezone.utc),
    ),
    AttemptResponse(
        attempt_id="attempt-002",
        study_set_id=STUDY_SET_1_ID,
        document_id=None,
        status=AttemptStatus.COMPLETED,
        total_marks=29.0,
        marks_awarded=25.0,
        created_at=datetime(2026, 8, 18, 14, 0, 0, tzinfo=timezone.utc),
        updated_at=datetime(2026, 8, 18, 14, 45, 0, tzinfo=timezone.utc),
    ),
]

MOCK_ATTEMPT_LIST = AttemptListResponse(attempts=MOCK_ATTEMPTS)

MOCK_EVALUATIONS: dict[str, EvaluationListResponse] = {
    "attempt-001": EvaluationListResponse(
        attempt_id="attempt-001",
        total_marks=7.0,
        earned_marks=6.0,
        percentage=85.71,
        results=[
            EvaluationResponse(
                question_id="question-001",
                student_answer="B",
                marks_awarded=2.0,
                final_score=1.0,
                is_correct=True,
                semantic_score=None,
                concept_score=None,
                matched_concepts=None,
                missed_concepts=None,
                keyword_stuffing_detected=False,
                logic_inversion_detected=False,
            ),
            EvaluationResponse(
                question_id="question-005",
                student_answer="A mutex allows only a single thread to access a critical section, whereas a counting semaphore allows up to N concurrent threads.",
                marks_awarded=4.0,
                final_score=0.8,
                is_correct=True,
                semantic_score=0.85,
                concept_score=0.8,
                matched_concepts=["single thread ownership", "resource count"],
                missed_concepts=["ownership release constraints"],
                keyword_stuffing_detected=False,
                logic_inversion_detected=False,
            ),
        ],
    ),
    "attempt-002": EvaluationListResponse(
        attempt_id="attempt-002",
        total_marks=29.0,
        earned_marks=25.0,
        percentage=86.21,
        results=[
            EvaluationResponse(
                question_id="question-001",
                student_answer="B",
                marks_awarded=2.0,
                final_score=1.0,
                is_correct=True,
                semantic_score=None,
                concept_score=None,
                matched_concepts=None,
                missed_concepts=None,
                keyword_stuffing_detected=False,
                logic_inversion_detected=False,
            ),
            EvaluationResponse(
                question_id="question-003",
                student_answer="By enforcing strict resource hierarchy ordering (acquire A before B), circular wait is impossible.",
                marks_awarded=8.0,
                final_score=0.8,
                is_correct=True,
                semantic_score=0.82,
                concept_score=0.8,
                matched_concepts=["global resource ordering", "circular wait elimination"],
                missed_concepts=["lock timeouts"],
                keyword_stuffing_detected=False,
                logic_inversion_detected=False,
            ),
            EvaluationResponse(
                question_id="question-004",
                student_answer="Address translation fails, triggering an OS trap. The OS identifies missing page, fetches it from backing store, updates page table, and resumes instruction.",
                marks_awarded=9.0,
                final_score=0.9,
                is_correct=True,
                semantic_score=0.92,
                concept_score=0.9,
                matched_concepts=["OS trap", "backing store swap", "page table update", "instruction restart"],
                missed_concepts=[],
                keyword_stuffing_detected=False,
                logic_inversion_detected=False,
            ),
            EvaluationResponse(
                question_id="question-005",
                student_answer="Mutex allows single owner; counting semaphore permits multiple units.",
                marks_awarded=4.0,
                final_score=0.8,
                is_correct=True,
                semantic_score=0.8,
                concept_score=0.8,
                matched_concepts=["ownership"],
                missed_concepts=["signaling mechanism"],
                keyword_stuffing_detected=False,
                logic_inversion_detected=False,
            ),
        ],
    ),
}
