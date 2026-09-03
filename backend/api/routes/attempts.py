from datetime import datetime, timezone
from typing import Literal
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status

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
    get_active_attempt_by_study_set,
)
from backend.database.evaluation_repository import (
    get_evaluations_with_question_details,
)
from backend.database import study_set_repository
from backend.services.evaluation_service import (
    evaluate_and_save_attempt_answers,
    get_attempt_section_completion_status,
)
from backend.services import revision_service

router = APIRouter(prefix="/attempts", tags=["Attempts"])


@router.post(
    "",
    response_model=AttemptResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start or resume a test attempt",
    description="Initializes a new quiz attempt for a study set, or resumes an ongoing 'in_progress' attempt if one exists."
)
def start_attempt(
    payload: StartAttemptRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> AttemptResponse:
    """
    Starts (or resumes) an attempt for one (study_set, question_type)
    pair. There is no other kind of attempt anymore - every attempt is
    independently scoped to exactly one question type from the very
    first one, so there's no separate "start the whole study set" flow
    to branch around; this used to be two paths (an initial, study-set-
    wide flow plus a revision-specific one bolted on beside it) that have
    since collapsed into this single one.
    """
    study_set_id_str = str(payload.study_set_id)
    doc_id_str = str(payload.document_id) if payload.document_id else None
    question_type = payload.question_type

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

    # 2. Gate: is this (study_set, question_type) pair allowed to start
    # an attempt right now? (4-attempt cap, scheduled due-date, and
    # needs_attention are all covered here - see
    # revision_service.is_attempt_allowed_now().)
    allowed, reason = revision_service.is_attempt_allowed_now(
        study_set_id_str, question_type, current_user.user_id
    )
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=reason
        )

    # 3. Resume an already-in-progress attempt of this exact type, if one
    # exists, instead of creating a duplicate.
    active_att = get_active_attempt_by_study_set(
        study_set_id_str, question_type=question_type, user_id=current_user.user_id
    )
    if active_att:
        completion_info = get_attempt_section_completion_status(active_att["attempt_id"])
        active_att.update(completion_info)
        return AttemptResponse(**active_att)

    # 4. Create a new attempt if no in_progress attempt exists for this type
    attempt_id = str(uuid.uuid4())

    save_attempt(
        attempt_id=attempt_id,
        question_type=question_type,
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
    completion_info = get_attempt_section_completion_status(attempt_id)
    att.update(completion_info)
    return AttemptResponse(**att)


@router.get(
    "/study-sets/{study_set_id}/active-attempt",
    response_model=AttemptResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current active in-progress attempt for a study set and question type",
    description="Retrieves active in-progress quiz attempt metadata and section completion status for one question type under a study set."
)
def get_active_attempt_for_study_set(
    study_set_id: uuid.UUID,
    question_type: Literal["mcq", "application", "long", "short"] = Query(
        ...,
        description="Which question type to look up the active attempt for - required, since more than one type can be independently in-progress at once."
    ),
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> AttemptResponse:
    study_set_id_str = str(study_set_id)
    study_set = study_set_repository.get_study_set(study_set_id_str, user_id=current_user.user_id)
    if not study_set:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Study set with ID '{study_set_id}' not found"
        )

    active_att = get_active_attempt_by_study_set(
        study_set_id_str, question_type=question_type, user_id=current_user.user_id
    )
    if not active_att:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No active in-progress attempt found for study set '{study_set_id}' and question_type '{question_type}'"
        )

    completion_info = get_attempt_section_completion_status(active_att["attempt_id"])
    active_att.update(completion_info)
    return AttemptResponse(**active_att)


@router.get(
    "/{attempt_id}",
    response_model=AttemptResponse,
    status_code=status.HTTP_200_OK,
    summary="Get test attempt details",
    description="Retrieves current metadata, status, and section completion for a specific test attempt."
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
    completion_info = get_attempt_section_completion_status(attempt_id)
    att.update(completion_info)
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

    completion_info = get_attempt_section_completion_status(attempt_id)
    if not completion_info["is_attempt_complete"]:
        rem = completion_info["remaining_sections"]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot finish attempt: incomplete sections: {rem}"
        )

    # Pure status transition, nothing else - the revision_schedules side
    # effect that used to belong here is gone. There's no longer a
    # separate "the study set's initial attempt finishes" event distinct
    # from "this attempt's one section finishes": the schedule row for a
    # (study_set, question_type) pair is created/updated the moment its
    # answers are saved, unconditionally, for every attempt (see
    # evaluation_service.evaluate_and_save_attempt_answers() and
    # revision_service.record_attempt_result()) - well before this route
    # is ever called.
    save_attempt(
        attempt_id=attempt_id,
        question_type=att.get("question_type"),
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
    updated_att.update(completion_info)
    updated_att["is_attempt_complete"] = True
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
        q_type = (rec.get("question_type") or "").lower().strip()
        if q_type == "mcq":
            corr_opt = rec.get("correct_option")
            opts = rec.get("options")
            if isinstance(opts, str):
                try:
                    import json
                    opts = json.loads(opts)
                except Exception:
                    opts = {}
            if corr_opt and isinstance(opts, dict) and str(corr_opt).strip() in opts:
                key = str(corr_opt).strip()
                val = str(opts[key]).strip()
                if val.lower().startswith(f"option {key.lower()}"):
                    correct_ans = val
                else:
                    correct_ans = f"Option {key}: {val}"
            elif corr_opt:
                correct_ans = f"Option {str(corr_opt).strip()}"
            else:
                correct_ans = None
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

