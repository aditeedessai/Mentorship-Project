from pydantic import BaseModel


class EvaluationRequest(BaseModel):
    question: str
    reference_answer: str
    student_answer: str


class EvaluationResponse(BaseModel):
    status: str
    message: str