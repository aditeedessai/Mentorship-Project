from fastapi import APIRouter
from services.quiz_service import generate_quiz
from schemas.quiz_schema import QuizRequest, QuizResponse

router = APIRouter(
    prefix="/generate-quiz",
    tags=["Quiz Generation"]
)

@router.post("/", response_model=QuizResponse)
def create_quiz(request: QuizRequest):
    return generate_quiz()