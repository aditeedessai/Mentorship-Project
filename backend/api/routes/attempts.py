from datetime import datetime, timezone
import uuid
from uuid import UUID
from fastapi import APIRouter, HTTPException, status

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
from backend.mock_data.attempts import MOCK_ATTEMPTS, MOCK_EVALUATIONS

router = APIRouter(prefix="/attempts", tags=["Attempts"])

# Temporary in-memory state for active FastAPI process
ATTEMPTS_STORE: dict[str, AttemptResponse] = {
    att.attempt_id: att for att in MOCK_ATTEMPTS
}
EVALUATIONS_STORE: dict[str, EvaluationListResponse] = dict(MOCK_EVALUATIONS)


@router.post(
    "",
    response_model=AttemptResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start a new test attempt",
    description="Initializes a new quiz attempt for a study set with status 'in_progress'."
)
def start_attempt(payload: StartAttemptRequest) -> AttemptResponse:
    now = datetime.now(timezone.utc)
    attempt_id = str(uuid.uuid4())
    new_attempt = AttemptResponse(
        attempt_id=attempt_id,
        study_set_id=payload.study_set_id,
        document_id=payload.document_id,
        status=AttemptStatus.IN_PROGRESS,
        total_marks=0.0,
        marks_awarded=0.0,
        created_at=now,
        updated_at=now
    )
    ATTEMPTS_STORE[attempt_id] = new_attempt
    EVALUATIONS_STORE[attempt_id] = EvaluationListResponse(
        attempt_id=attempt_id,
        total_marks=0.0,
        earned_marks=0.0,
        percentage=0.0,
        results=[]
    )
    return new_attempt


@router.get(
    "/{attempt_id}",
    response_model=AttemptResponse,
    status_code=status.HTTP_200_OK,
    summary="Get test attempt details",
    description="Retrieves current metadata and status for a specific test attempt."
)
def get_attempt(attempt_id: str) -> AttemptResponse:
    if attempt_id not in ATTEMPTS_STORE:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attempt with ID '{attempt_id}' not found"
        )
    return ATTEMPTS_STORE[attempt_id]


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
    if attempt_id not in ATTEMPTS_STORE:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attempt with ID '{attempt_id}' not found"
        )

    attempt = ATTEMPTS_STORE[attempt_id]
    if attempt.status == AttemptStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot submit answers for a completed attempt"
        )

    eval_list = EVALUATIONS_STORE.setdefault(
        attempt_id,
        EvaluationListResponse(
            attempt_id=attempt_id,
            total_marks=0.0,
            earned_marks=0.0,
            percentage=0.0,
            results=[]
        )
    )

    new_results = []
    for item in payload.answers:
        marks = 2.0 if payload.question_type.value == "mcq" else 10.0
        eval_resp = EvaluationResponse(
            question_id=item.question_id,
            student_answer=item.student_answer,
            marks_awarded=marks,
            final_score=1.0,
            is_correct=True,
            semantic_score=1.0 if payload.question_type.value != "mcq" else None,
            concept_score=1.0 if payload.question_type.value != "mcq" else None,
            matched_concepts=["core_concept"],
            missed_concepts=[],
            keyword_stuffing_detected=False,
            logic_inversion_detected=False,
        )
        new_results.append(eval_resp)

    eval_list.results.extend(new_results)
    earned = sum(e.marks_awarded for e in eval_list.results)
    total = earned
    pct = 100.0 if total > 0 else 0.0

    eval_list.total_marks = total
    eval_list.earned_marks = earned
    eval_list.percentage = pct

    attempt.total_marks = total
    attempt.marks_awarded = earned
    attempt.updated_at = datetime.now(timezone.utc)

    return eval_list


@router.post(
    "/{attempt_id}/finish",
    response_model=AttemptResponse,
    status_code=status.HTTP_200_OK,
    summary="Finish a test attempt",
    description="Finalizes an active quiz attempt, updating its status from 'in_progress' to 'completed'."
)
def finish_attempt(attempt_id: str) -> AttemptResponse:
    if attempt_id not in ATTEMPTS_STORE:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attempt with ID '{attempt_id}' not found"
        )

    attempt = ATTEMPTS_STORE[attempt_id]
    if attempt.status == AttemptStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attempt is already completed"
        )

    attempt.status = AttemptStatus.COMPLETED
    attempt.updated_at = datetime.now(timezone.utc)
    return attempt


@router.get(
    "/{attempt_id}/evaluations",
    response_model=EvaluationListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get question-level evaluations for an attempt",
    description="Retrieves question-level evaluation records for a specific test attempt."
)
def get_attempt_evaluations(attempt_id: str) -> EvaluationListResponse:
    if attempt_id not in ATTEMPTS_STORE:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attempt with ID '{attempt_id}' not found"
        )
    return EVALUATIONS_STORE.get(
        attempt_id,
        EvaluationListResponse(
            attempt_id=attempt_id,
            total_marks=0.0,
            earned_marks=0.0,
            percentage=0.0,
            results=[]
        )
    )

