from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status

from backend.api.deps import AuthenticatedUser, get_current_user
from backend.api.schemas.exam import (
    CreateExamRequest,
    DeleteExamResponse,
    ExamListResponse,
    ExamResponse,
)
from backend.database import exam_repository

router = APIRouter(prefix="/exams", tags=["Exams"])


@router.get(
    "",
    response_model=ExamListResponse,
    status_code=status.HTTP_200_OK,
    summary="List upcoming exams",
    description="Retrieves all exams for the authenticated user, nearest exam date first."
)
def list_exams(
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> ExamListResponse:
    try:
        exams_data = exam_repository.get_exams(user_id=current_user.user_id)
        return ExamListResponse(exams=[ExamResponse(**e) for e in exams_data])
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list exams: {str(e)}"
        )


@router.post(
    "",
    response_model=ExamResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new exam",
    description="Creates a new exam for the authenticated user, optionally linked to a study set."
)
def create_exam(
    payload: CreateExamRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> ExamResponse:
    try:
        data = exam_repository.create_exam(
            payload.subject,
            payload.exam_type,
            payload.exam_date.isoformat(),
            user_id=current_user.user_id,
            study_set_id=str(payload.study_set_id) if payload.study_set_id else None
        )
        return ExamResponse(**data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create exam: {str(e)}"
        )


@router.delete(
    "/{exam_id}",
    response_model=DeleteExamResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete an exam by ID",
    description="Deletes a specific exam by its UUID if owned by the authenticated user."
)
def delete_exam(
    exam_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> DeleteExamResponse:
    try:
        deleted = exam_repository.delete_exam(str(exam_id), user_id=current_user.user_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Exam with ID '{exam_id}' not found"
            )
        return DeleteExamResponse(
            message="Exam deleted successfully",
            exam_id=exam_id
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete exam: {str(e)}"
        )
