from pydantic import BaseModel


class QuizRequest(BaseModel):
    document_id: str


class QuizResponse(BaseModel):
    status: str
    message: str