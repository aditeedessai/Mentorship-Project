from datetime import datetime, timezone
import uuid
from uuid import UUID
from fastapi import APIRouter, HTTPException, status

try:
    from api.schemas.study_set import (
        CreateStudySetRequest,
        StudySetListResponse,
        StudySetResponse,
    )
    from mock_data.study_sets import MOCK_STUDY_SETS
except ModuleNotFoundError:
    from backend.api.schemas.study_set import (
        CreateStudySetRequest,
        StudySetListResponse,
        StudySetResponse,
    )
    from backend.mock_data.study_sets import MOCK_STUDY_SETS

router = APIRouter(prefix="/study-sets", tags=["Study Sets"])


@router.post(
    "",
    response_model=StudySetResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new study set",
    description="Creates a new study set with the provided name and returns study set details."
)
def create_study_set(payload: CreateStudySetRequest) -> StudySetResponse:
    now = datetime.now(timezone.utc)
    new_set = StudySetResponse(
        study_set_id=uuid.uuid4(),
        name=payload.name,
        created_at=now,
        updated_at=now
    )
    MOCK_STUDY_SETS.append(new_set)
    return new_set


@router.get(
    "",
    response_model=StudySetListResponse,
    status_code=status.HTTP_200_OK,
    summary="List all study sets",
    description="Retrieves a list of available study sets."
)
def list_study_sets() -> StudySetListResponse:
    return StudySetListResponse(study_sets=MOCK_STUDY_SETS)


@router.get(
    "/{study_set_id}",
    response_model=StudySetResponse,
    status_code=status.HTTP_200_OK,
    summary="Get study set details by ID",
    description="Retrieves details for a specific study set by its UUID."
)
def get_study_set(study_set_id: UUID) -> StudySetResponse:
    for study_set in MOCK_STUDY_SETS:
        if study_set.study_set_id == study_set_id:
            return study_set
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Study set with ID '{study_set_id}' not found"
    )

