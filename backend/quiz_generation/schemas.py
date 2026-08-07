from typing import Dict, List, Optional, Literal
from pydantic import BaseModel


class QuizRequest(BaseModel):
    text: str


class QuizQuestion(BaseModel):
    question_id: str

    question_type: Literal[
        "mcq",
        "short",
        "detailed",
        "application"
    ]

    topic: str
    question: str
    reference_answer: str

    # Only required for MCQs
    options: Optional[Dict[str, str]] = None
    correct_option: Optional[Literal["A", "B", "C", "D"]] = None


class QuizResponse(BaseModel):
    questions: List[QuizQuestion]