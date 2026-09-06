import traceback
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status

from backend.api.deps import AuthenticatedUser, get_current_user
from backend.api.schemas.question import (
    GenerateQuestionsRequest,
    QuestionListResponse,
    QuestionResponse,
    QuestionType,
)
from backend.database import quiz_repository, study_set_repository
from backend.database.attempt_repository import get_attempt as get_attempt_from_db
from backend.services import quiz_service

router = APIRouter(tags=["Questions"])


@router.post(
    "/study-sets/{study_set_id}/questions/generate",
    response_model=QuestionListResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate questions for a study set",
    description="Generates questions of a specified type (mcq, application, long, short) for a given study set."
)
def generate_questions(
    study_set_id: UUID,
    payload: GenerateQuestionsRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> QuestionListResponse:
    # 1. Verify study set exists and belongs to current_user.user_id
    study_set = study_set_repository.get_study_set(str(study_set_id), user_id=current_user.user_id)
    if not study_set:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Study set with ID '{study_set_id}' not found"
        )

    # 2. If payload specifies document_id, verify document exists and belongs to this study set
    doc_id_str = str(payload.document_id) if payload.document_id else None
    if doc_id_str:
        doc = study_set_repository.get_document_by_id(doc_id_str)
        if not doc or doc.get("study_set_id") != str(study_set_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document with ID '{payload.document_id}' not found"
            )

    # 2b. If payload specifies attempt_id, verify it belongs to this user,
    # this study set, and this question type - the generated batch below
    # gets tagged with it, so a mismatched/foreign attempt_id must never
    # be accepted silently.
    if payload.attempt_id:
        attempt = get_attempt_from_db(payload.attempt_id, user_id=current_user.user_id)
        if (
            not attempt
            or attempt.get("study_set_id") != str(study_set_id)
            or attempt.get("question_type") != payload.question_type.value
        ):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Attempt with ID '{payload.attempt_id}' not found for this study set and question type"
            )

    # 2c. Idempotency guard: if this attempt already has its own generated
    # questions of this type, return that existing set instead of
    # generating (and appending) a second batch on top of it. Without
    # this, two requests for the same attempt_id - a double-click before
    # the "Start" button's disabled state paints, a network retry after a
    # response was lost, two browser tabs - each independently see zero
    # existing questions for this brand-new attempt and each generate a
    # full fresh batch, since generate_quiz() always assigns new UUIDs
    # and never checks for a prior generation itself. This makes the
    # endpoint safe to call more than once for the same attempt no matter
    # the cause, instead of relying on the frontend to never do so.
    if payload.attempt_id:
        already_generated = quiz_repository.get_questions_by_study_set(
            str(study_set_id), attempt_id=payload.attempt_id
        )
        already_generated = [
            q for q in already_generated if q.get("question_type") == payload.question_type.value
        ]
        if already_generated:
            return QuestionListResponse(
                questions=[QuestionResponse(**q) for q in already_generated]
            )

    # 3. Call quiz_service.run_quiz
    try:
        raw_questions = quiz_service.run_quiz(
            study_set_id=str(study_set_id),
            question_type=payload.question_type.value,
            document_ids=doc_id_str,
            attempt_id=payload.attempt_id,
            user_id=current_user.user_id
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        # quiz_service.run_quiz -> generate_quiz can fail deep inside the
        # Gemini call or the JSON parse of its response - str(e) alone
        # (still included below, in the HTTP response) is often too thin
        # to diagnose which one it was, so the full traceback goes to the
        # server log here too.
        print("===== /questions/generate failed =====")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate questions: {str(e)}"
        )

    # 4. Format generated questions into QuestionResponse list
    response_questions = [QuestionResponse(**q) for q in raw_questions]
    return QuestionListResponse(questions=response_questions)


@router.get(
    "/study-sets/{study_set_id}/questions",
    response_model=QuestionListResponse,
    status_code=status.HTTP_200_OK,
    summary="List questions in a study set",
    description="Retrieves generated questions for a study set, optionally filtered by question type."
)
def list_questions(
    study_set_id: UUID,
    question_type: QuestionType | None = Query(
        None,
        description="Optional filter by question type (mcq, application, long, short)"
    ),
    attempt_id: str | None = Query(
        None,
        description="Optional attempt ID to scope results to ONLY the questions "
                     "generated for that specific attempt (e.g. the quiz page for "
                     "an in-progress or just-started attempt). Omit to get every "
                     "question ever generated for this study set (+ type)."
    ),
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> QuestionListResponse:
    # 1. Verify study set exists and belongs to current_user.user_id
    study_set = study_set_repository.get_study_set(str(study_set_id), user_id=current_user.user_id)
    if not study_set:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Study set with ID '{study_set_id}' not found"
        )

    # Guards against calling this function directly (bypassing FastAPI's
    # dependency-injection layer, as several tests in this repo do) -
    # in that case `attempt_id` is still the raw Query(None, ...)
    # sentinel object, not a real None, so `if attempt_id:` alone would
    # be true for it. Same defensive pattern question_type already uses
    # below (hasattr(..., "value") / isinstance(..., str)).
    attempt_id_str = attempt_id if isinstance(attempt_id, str) else None

    # 1b. If attempt_id is given, verify it belongs to this user and this
    # study set before using it to scope the query below.
    if attempt_id_str:
        attempt = get_attempt_from_db(attempt_id_str, user_id=current_user.user_id)
        if not attempt or attempt.get("study_set_id") != str(study_set_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Attempt with ID '{attempt_id_str}' not found for this study set"
            )

    # 2. Query questions from Supabase quiz_repository
    try:
        db_questions = quiz_repository.get_questions_by_study_set(str(study_set_id), attempt_id=attempt_id_str)
        if question_type and hasattr(question_type, "value"):
            target_val = question_type.value
            db_questions = [
                q for q in db_questions
                if q.get("question_type") == target_val
            ]
        elif isinstance(question_type, str):
            db_questions = [
                q for q in db_questions
                if q.get("question_type") == question_type
            ]
        return QuestionListResponse(
            questions=[QuestionResponse(**q) for q in db_questions]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve questions: {str(e)}"
        )


@router.get(
    "/questions/{question_id}",
    response_model=QuestionResponse,
    status_code=status.HTTP_200_OK,
    summary="Get question details by ID",
    description="Retrieves student-facing details for a specific question by its ID."
)
def get_question(
    question_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> QuestionResponse:
    try:
        q = quiz_repository.get_question_by_id(question_id)
        if not q:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Question with ID '{question_id}' not found"
            )

        # Verify ownership through relationship: question -> study_set -> user_id
        if q.get("study_set_id"):
            study_set = study_set_repository.get_study_set(q["study_set_id"], user_id=current_user.user_id)
            if not study_set:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Question with ID '{question_id}' not found"
                )

        return QuestionResponse(**q)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve question details: {str(e)}"
        )

