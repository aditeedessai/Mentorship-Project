from fastapi import APIRouter
from services.upload_service import upload_document
from schemas.upload_schema import UploadRequest, UploadResponse

router = APIRouter(
    prefix="/upload",
    tags=["Upload"]
)

@router.post("/", response_model=UploadResponse)
def upload_file(request: UploadRequest):
    return upload_document()