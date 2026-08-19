from datetime import datetime, timezone
from uuid import UUID

from backend.api.schemas.study_set import StudySetListResponse, StudySetResponse

STUDY_SET_1_ID = UUID("00000000-0000-4000-8000-000000000001")
STUDY_SET_2_ID = UUID("00000000-0000-4000-8000-000000000002")

MOCK_STUDY_SETS: list[StudySetResponse] = [
    StudySetResponse(
        study_set_id=STUDY_SET_1_ID,
        name="Operating Systems & System Architecture",
        created_at=datetime(2026, 8, 15, 10, 0, 0, tzinfo=timezone.utc),
        updated_at=datetime(2026, 8, 18, 14, 30, 0, tzinfo=timezone.utc),
    ),
    StudySetResponse(
        study_set_id=STUDY_SET_2_ID,
        name="Computer Networks & Protocols",
        created_at=datetime(2026, 8, 16, 11, 0, 0, tzinfo=timezone.utc),
        updated_at=datetime(2026, 8, 18, 15, 0, 0, tzinfo=timezone.utc),
    ),
]

MOCK_STUDY_SET_LIST = StudySetListResponse(study_sets=MOCK_STUDY_SETS)
