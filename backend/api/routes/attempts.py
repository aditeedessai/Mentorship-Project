from datetime import datetime, timezone
import uuid
from fastapi import APIRouter, Depends, HTTPException, status

from backend.api.deps import AuthenticatedUser, get_current_user
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
from backend.database.attempt_repository import (
    get_attempt as get_attempt_from_db,
    save_attempt,
)
from backend.database.evaluation_repository import (
    get_evaluations_with_question_details,
)
from backend.database import study_set_repository
from backend.services.evaluation_service import (
    evaluate_and_save_attempt_answers,
)

router = APIRouter(prefix="/attempts", tags=["Attempts"])


@router.post(
    "",
    response_model=AttemptResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start a new test attempt",
    description="Initializes a new quiz attempt for a study set with status 'in_progress'."
)
def start_attempt(
    payload: StartAttemptRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> AttemptResponse:
    study_set_id_str = str(payload.study_set_id)
    doc_id_str = str(payload.document_id) if payload.document_id else None

    # 1. Verify study set exists and belongs to current_user.user_id
    study_set = study_set_repository.get_study_set(study_set_id_str, user_id=current_user.user_id)
    if not study_set:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Study set with ID '{payload.study_set_id}' not found"
        )

    if doc_id_str:
        doc = study_set_repository.get_document_by_id(doc_id_str)
        if not doc or doc.get("study_set_id") != study_set_id_str:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document with ID '{payload.document_id}' not found"
            )

    attempt_id = str(uuid.uuid4())

    save_attempt(
        attempt_id=attempt_id,
        total_marks=0.0,
        marks_awarded=0.0,
        study_set_id=study_set_id_str,
        document_id=doc_id_str,
        status=AttemptStatus.IN_PROGRESS.value,
        user_id=current_user.user_id
    )

    att = get_attempt_from_db(attempt_id, user_id=current_user.user_id)
    if not att:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create quiz attempt in database"
        )
    return AttemptResponse(**att)


@router.get(
    "/{attempt_id}",
    response_model=AttemptResponse,
    status_code=status.HTTP_200_OK,
    summary="Get test attempt details",
    description="Retrieves current metadata and status for a specific test attempt."
)
def get_attempt(
    attempt_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> AttemptResponse:
    att = get_attempt_from_db(attempt_id, user_id=current_user.user_id)
    if not att:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attempt with ID '{attempt_id}' not found"
        )
    return AttemptResponse(**att)


@router.post(
    "/{attempt_id}/answers",
    response_model=EvaluationListResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit answers for a question-type section",
    description="Submits student answers for one question-type section under an ongoing attempt."
)
def submit_section_answers(
    attempt_id: str,
    payload: SubmitAnswersRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> EvaluationListResponse:
    # Verify attempt ownership BEFORE evaluating or saving answers
    att = get_attempt_from_db(attempt_id, user_id=current_user.user_id)
    if not att:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attempt with ID '{attempt_id}' not found"
        )

    try:
        answers_data = [
            {"question_id": item.question_id, "student_answer": item.student_answer}
            for item in payload.answers
        ]
        result = evaluate_and_save_attempt_answers(attempt_id, answers_data)
        return EvaluationListResponse(**result)
    except ValueError as e:
        err_msg = str(e)
        if "not found" in err_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=err_msg
            )
        elif "completed" in err_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=err_msg
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=err_msg
            )


@router.post(
    "/{attempt_id}/finish",
    response_model=AttemptResponse,
    status_code=status.HTTP_200_OK,
    summary="Finish a test attempt",
    description="Finalizes an active quiz attempt, updating its status from 'in_progress' to 'completed'."
)
def finish_attempt(
    attempt_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> AttemptResponse:
    att = get_attempt_from_db(attempt_id, user_id=current_user.user_id)
    if not att:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attempt with ID '{attempt_id}' not found"
        )

    if att.get("status") == AttemptStatus.COMPLETED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attempt is already completed"
        )

    save_attempt(
        attempt_id=attempt_id,
        total_marks=float(att.get("total_marks", 0.0)),
        marks_awarded=float(att.get("marks_awarded", 0.0)),
        study_set_id=att.get("study_set_id"),
        document_id=att.get("document_id"),
        status=AttemptStatus.COMPLETED.value,
        user_id=current_user.user_id
    )
    updated_att = get_attempt_from_db(attempt_id, user_id=current_user.user_id)
    if not updated_att:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve updated attempt"
        )
    return AttemptResponse(**updated_att)

@router.get(
    "/{attempt_id}/evaluations",
    response_model=EvaluationListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get question-level evaluations for an attempt",
    description="Retrieves question-level evaluation records for a specific test attempt."
)
def get_attempt_evaluations(
    attempt_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> EvaluationListResponse:
    att = get_attempt_from_db(attempt_id, user_id=current_user.user_id)
    if not att:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attempt with ID '{attempt_id}' not found"
        )

    eval_records = get_evaluations_with_question_details(attempt_id)

    eval_responses = []
    for rec in eval_records:
        is_corr = rec.get("is_correct")
        if is_corr is None:
            final_s = rec.get("final_score")
            is_corr = (final_s >= 0.55) if final_s is not None else None

        # Build correct_answer text
        correct_ans = None
        q_type = (rec.get("question_type") or "").lower()
        if q_type == "mcq":
            corr_opt = rec.get("correct_option")
            opts = rec.get("options")
            if isinstance(opts, str):
                try:
                    import json
                    opts = json.loads(opts)
                except Exception:
                    opts = {}
            if corr_opt and isinstance(opts, dict) and corr_opt in opts:
                correct_ans = f"Option {corr_opt}: {opts[corr_opt]}"
            elif corr_opt:
                correct_ans = f"Option {corr_opt}"
            else:
                correct_ans = rec.get("reference_answer")
        else:
            correct_ans = rec.get("reference_answer")

        # Build feedback summary text
        feedback_str = None
        if is_corr:
            feedback_str = "Great job! Your answer matches the model criteria."
        else:
            missed = rec.get("missed_concepts")
            if missed and isinstance(missed, list) and len(missed) > 0:
                feedback_str = f"Missed key concepts: {', '.join(missed)}"
            else:
                feedback_str = "Review this topic in your study material to reinforce the concept."

        eval_responses.append(
            EvaluationResponse(
                question_id=rec["question_id"],
                student_answer=rec.get("student_answer"),
                marks_awarded=float(rec["marks_awarded"]),
                final_score=float(rec["final_score"]),
                is_correct=is_corr,
                semantic_score=float(rec["semantic_score"]) if rec.get("semantic_score") is not None else None,
                concept_score=float(rec["concept_score"]) if rec.get("concept_score") is not None else None,
                matched_concepts=rec.get("matched_concepts"),
                missed_concepts=rec.get("missed_concepts"),
                keyword_stuffing_detected=False,
                logic_inversion_detected=False,
                question_text=rec.get("question_text"),
                question_type=rec.get("question_type"),
                correct_answer=correct_ans,
                max_marks=float(rec.get("max_marks", 2.0 if q_type == "mcq" else 10.0)),
                feedback=feedback_str,
            )
        )

    total_marks = sum(float(rec.get("max_marks", 0.0)) for rec in eval_records)
    earned_marks = sum(float(rec.get("marks_awarded", 0.0)) for rec in eval_records)
    percentage = round((earned_marks / total_marks * 100.0), 2) if total_marks > 0 else 0.0

    return EvaluationListResponse(
        attempt_id=attempt_id,
        total_marks=total_marks,
        earned_marks=earned_marks,
        percentage=percentage,
        results=eval_responses
    )

