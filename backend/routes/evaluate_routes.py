from fastapi import APIRouter
from services.evaluation_service import evaluate_answer
from schemas.evaluation_schema import EvaluationRequest, EvaluationResponse

router = APIRouter(
    prefix="/evaluate",
    tags=["Answer Evaluation"]
)

@router.post("/", response_model=EvaluationResponse)
def evaluate(request: EvaluationRequest):
    return evaluate_answer()