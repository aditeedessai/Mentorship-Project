from fastapi import APIRouter, HTTPException

from .schemas import QuizRequest
from .quiz_generator import generate_quiz


router = APIRouter()


@router.post("/generate-quiz")
def generate(request: QuizRequest):

    if not request.text.strip():
        raise HTTPException(
            status_code=400,
            detail="Text cannot be empty."
        )

    try:
        quiz = generate_quiz(request.text)

        return quiz

    except ValueError as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Quiz generation failed: {str(e)}"
        )