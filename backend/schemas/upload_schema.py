from pydantic import BaseModel


class UploadRequest(BaseModel):
    filename: str


class UploadResponse(BaseModel):
    status: str
    message: str