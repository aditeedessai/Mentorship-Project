from pydantic import BaseModel
from typing import List


class QuizRequest(BaseModel):
    text: str


class MCQQuestion(BaseModel):
    id: int
    question: str
    options: List[str]
    correct_answer: str
    reference_answer: str


class QuizResponse(BaseModel):
    questions: List[MCQQuestion]