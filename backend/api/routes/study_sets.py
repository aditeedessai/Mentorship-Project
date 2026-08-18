from datetime import datetime, timezone
import uuid
from uuid import UUID
from fastapi import APIRouter, status

try:
    from api.schemas.study_set import (
        CreateStudySetRequest,
        StudySetListResponse,
        StudySetResponse,
    )
except ModuleNotFoundError:
    from backend.api.schemas.study_set import (
        CreateStudySetRequest,
        StudySetListResponse,
        StudySetResponse,
    )

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
    return StudySetResponse(
        study_set_id=uuid.uuid4(),
        name=payload.name,
        created_at=now,
        updated_at=now
    )


@router.get(
    "",
    response_model=StudySetListResponse,
    status_code=status.HTTP_200_OK,
    summary="List all study sets",
    description="Retrieves a list of available study sets."
)
def list_study_sets() -> StudySetListResponse:
    now = datetime.now(timezone.utc)
    placeholder_set = StudySetResponse(
        study_set_id=uuid.UUID("00000000-0000-4000-8000-000000000001"),
        name="Sample Study Set",
        created_at=now,
        updated_at=now
    )
    return StudySetListResponse(study_sets=[placeholder_set])


@router.get(
    "/{study_set_id}",
    response_model=StudySetResponse,
    status_code=status.HTTP_200_OK,
    summary="Get study set details by ID",
    description="Retrieves details for a specific study set by its UUID."
)
def get_study_set(study_set_id: UUID) -> StudySetResponse:
    now = datetime.now(timezone.utc)
    return StudySetResponse(
        study_set_id=study_set_id,
        name="Sample Study Set",
        created_at=now,
        updated_at=now
    )
