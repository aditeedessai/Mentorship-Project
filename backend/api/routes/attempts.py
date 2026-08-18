from datetime import datetime, timezone
import uuid
from uuid import UUID
from fastapi import APIRouter, status

try:
    from api.schemas.answer import (
        EvaluationListResponse,
        EvaluationResponse,
        SubmitAnswersRequest,
    )
    from api.schemas.attempt import (
        AttemptResponse,
        AttemptStatus,
        StartAttemptRequest,
    )
except ModuleNotFoundError:
    from backend.api.schemas.answer import (
        EvaluationListResponse,
        EvaluationResponse,
        SubmitAnswersRequest,
    )
    from backend.api.schemas.attempt import (
        AttemptResponse,
        AttemptStatus,
        StartAttemptRequest,
    )

router = APIRouter(prefix="/attempts", tags=["Attempts"])


@router.post(
    "",
    response_model=AttemptResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start a new test attempt",
    description="Initializes a new quiz attempt for a study set with status 'in_progress'."
)
def start_attempt(payload: StartAttemptRequest) -> AttemptResponse:
    now = datetime.now(timezone.utc)
    return AttemptResponse(
        attempt_id=str(uuid.uuid4()),
        study_set_id=payload.study_set_id,
        document_id=payload.document_id,
        status=AttemptStatus.IN_PROGRESS,
        total_marks=0.0,
        marks_awarded=0.0,
        created_at=now,
        updated_at=now
    )


@router.get(
    "/{attempt_id}",
    response_model=AttemptResponse,
    status_code=status.HTTP_200_OK,
    summary="Get test attempt details",
    description="Retrieves current metadata and status for a specific test attempt."
)
def get_attempt(attempt_id: str) -> AttemptResponse:
    now = datetime.now(timezone.utc)
    return AttemptResponse(
        attempt_id=attempt_id,
        study_set_id=uuid.UUID("00000000-0000-4000-8000-000000000001"),
        document_id=None,
        status=AttemptStatus.IN_PROGRESS,
        total_marks=20.0,
        marks_awarded=18.0,
        created_at=now,
        updated_at=now
    )


@router.post(
    "/{attempt_id}/answers",
    response_model=EvaluationListResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit answers for a question-type section",
    description="Submits student answers for one question-type section under an ongoing attempt."
)
def submit_section_answers(
    attempt_id: str,
    payload: SubmitAnswersRequest
) -> EvaluationListResponse:
    placeholder_evals = []
    for item in payload.answers:
        placeholder_evals.append(
            EvaluationResponse(
                question_id=item.question_id,
                student_answer=item.student_answer,
                marks_awarded=2.0 if payload.question_type.value == "mcq" else 10.0,
                final_score=1.0,
                is_correct=True,
                semantic_score=1.0 if payload.question_type.value != "mcq" else None,
                concept_score=1.0 if payload.question_type.value != "mcq" else None,
                matched_concepts=["core_concept"],
                missed_concepts=[]
            )
        )

    total_m = sum(e.marks_awarded for e in placeholder_evals)
    return EvaluationListResponse(
        attempt_id=attempt_id,
        total_marks=total_m,
        earned_marks=total_m,
        percentage=100.0,
        results=placeholder_evals
    )


@router.post(
    "/{attempt_id}/finish",
    response_model=AttemptResponse,
    status_code=status.HTTP_200_OK,
    summary="Finish a test attempt",
    description="Finalizes an active quiz attempt, updating its status from 'in_progress' to 'completed'."
)
def finish_attempt(attempt_id: str) -> AttemptResponse:
    now = datetime.now(timezone.utc)
    return AttemptResponse(
        attempt_id=attempt_id,
        study_set_id=uuid.UUID("00000000-0000-4000-8000-000000000001"),
        document_id=None,
        status=AttemptStatus.COMPLETED,
        total_marks=40.0,
        marks_awarded=36.0,
        created_at=now,
        updated_at=now
    )


@router.get(
    "/{attempt_id}/evaluations",
    response_model=EvaluationListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get question-level evaluations for an attempt",
    description="Retrieves question-level evaluation records for a specific test attempt."
)
def get_attempt_evaluations(attempt_id: str) -> EvaluationListResponse:
    placeholder_eval = EvaluationResponse(
        question_id="00000000-0000-4000-8000-000000000003",
        student_answer="A",
        marks_awarded=2.0,
        final_score=1.0,
        is_correct=True,
        semantic_score=None,
        concept_score=None,
        matched_concepts=None,
        missed_concepts=None
    )
    return EvaluationListResponse(
        attempt_id=attempt_id,
        total_marks=2.0,
        earned_marks=2.0,
        percentage=100.0,
        results=[placeholder_eval]
    )
