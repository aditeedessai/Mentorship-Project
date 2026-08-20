from datetime import datetime, timezone
import uuid
from uuid import UUID
from fastapi import APIRouter, HTTPException, status

from backend.api.schemas.study_set import (
    CreateStudySetRequest,
    StudySetListResponse,
    StudySetResponse,
)
from backend.services import study_service

router = APIRouter(prefix="/study-sets", tags=["Study Sets"])


@router.post(
    "",
    response_model=StudySetResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new study set",
    description="Creates a new study set with the provided name and returns study set details."
)
def create_study_set(payload: CreateStudySetRequest) -> StudySetResponse:
    try:
        data = study_service.create_study_set(payload.name)
        return StudySetResponse(**data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create study set: {str(e)}"
        )


@router.get(
    "",
    response_model=StudySetListResponse,
    status_code=status.HTTP_200_OK,
    summary="List all study sets",
    description="Retrieves a list of available study sets."
)
def list_study_sets() -> StudySetListResponse:
    try:
        sets_data = study_service.list_study_sets()
        return StudySetListResponse(
            study_sets=[StudySetResponse(**s) for s in sets_data]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list study sets: {str(e)}"
        )


@router.get(
    "/{study_set_id}",
    response_model=StudySetResponse,
    status_code=status.HTTP_200_OK,
    summary="Get study set details by ID",
    description="Retrieves details for a specific study set by its UUID."
)
def get_study_set(study_set_id: UUID) -> StudySetResponse:
    try:
        data = study_service.get_study_set(str(study_set_id))
        if not data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Study set with ID '{study_set_id}' not found"
            )
        return StudySetResponse(**data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get study set details: {str(e)}"
        )

