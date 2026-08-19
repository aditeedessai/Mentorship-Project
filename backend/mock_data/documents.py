from datetime import datetime, timezone
from uuid import UUID

from backend.api.schemas.document import DocumentListResponse, DocumentResponse
from backend.mock_data.study_sets import STUDY_SET_1_ID, STUDY_SET_2_ID

DOC_1_ID = UUID("10000000-0000-4000-8000-000000000001")
DOC_2_ID = UUID("10000000-0000-4000-8000-000000000002")
DOC_3_ID = UUID("10000000-0000-4000-8000-000000000003")

MOCK_DOCUMENTS: list[DocumentResponse] = [
    DocumentResponse(
        document_id=DOC_1_ID,
        study_set_id=STUDY_SET_1_ID,
        file_name="operating_systems.pdf",
        file_path="/uploads/operating_systems.pdf",
        created_at=datetime(2026, 8, 15, 10, 5, 0, tzinfo=timezone.utc),
    ),
    DocumentResponse(
        document_id=DOC_2_ID,
        study_set_id=STUDY_SET_1_ID,
        file_name="process_management_notes.docx",
        file_path="/uploads/process_management_notes.docx",
        created_at=datetime(2026, 8, 15, 10, 10, 0, tzinfo=timezone.utc),
    ),
    DocumentResponse(
        document_id=DOC_3_ID,
        study_set_id=STUDY_SET_2_ID,
        file_name="computer_networks.pdf",
        file_path="/uploads/computer_networks.pdf",
        created_at=datetime(2026, 8, 16, 11, 15, 0, tzinfo=timezone.utc),
    ),
]

MOCK_DOCUMENT_LIST = DocumentListResponse(documents=MOCK_DOCUMENTS)
