import sys
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from fastapi.testclient import TestClient
from backend.api.main import app
from backend.api.deps import get_current_user, AuthenticatedUser
from backend.database.study_set_repository import list_study_sets

# Setup auth override
study_sets = list_study_sets()
if not study_sets:
    print("No study set found")
    sys.exit(1)

study_set_id = study_sets[0]['study_set_id']
user_id = study_sets[0].get('user_id') or "test-user-id"

app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(user_id=user_id)
client = TestClient(app)

print(f"=== E2E VERIFICATION TEST FLOW for study_set_id={study_set_id} ===")

# --- 1. Test MCQ Attempt ---
res_q_mcq = client.get(f"/api/study-sets/{study_set_id}/questions?question_type=mcq")
questions_mcq = res_q_mcq.json().get("questions", [])
if questions_mcq:
    target_mcq = questions_mcq[0]
    res_att_mcq = client.post("/api/attempts", json={"study_set_id": study_set_id})
    att_id_mcq = res_att_mcq.json()["attempt_id"]

    opts = target_mcq.get("options") or {}
    submitted_opt = list(opts.keys())[0] if isinstance(opts, dict) and opts else "A"

    client.post(f"/api/attempts/{att_id_mcq}/answers", json={
        "question_type": "mcq",
        "attempt_id": att_id_mcq,
        "answers": [{"question_id": target_mcq["question_id"], "student_answer": submitted_opt}]
    })
    client.post(f"/api/attempts/{att_id_mcq}/finish")

    res_eval_mcq = client.get(f"/api/attempts/{att_id_mcq}/evaluations")
    eval_mcq = res_eval_mcq.json().get("results", [])[0]

    print("\n--- MCQ EVALUATION ITEM ---")
    print("question_type:", eval_mcq.get("question_type"))
    print("question_text:", eval_mcq.get("question_text"))
    print("student_answer:", eval_mcq.get("student_answer"))
    print("correct_answer:", eval_mcq.get("correct_answer"))

    assert eval_mcq.get("question_type") == "mcq"
    assert "Option " in str(eval_mcq.get("correct_answer")), "MCQ correct_answer must contain Option text!"
    print("MCQ verification passed cleanly!")

# --- 2. Test Short Answer Attempt ---
res_q_short = client.get(f"/api/study-sets/{study_set_id}/questions?question_type=short")
questions_short = res_q_short.json().get("questions", [])
if questions_short:
    target_short = questions_short[0]
    res_att_short = client.post("/api/attempts", json={"study_set_id": study_set_id})
    att_id_short = res_att_short.json()["attempt_id"]

    client.post(f"/api/attempts/{att_id_short}/answers", json={
        "question_type": "short",
        "attempt_id": att_id_short,
        "answers": [{"question_id": target_short["question_id"], "student_answer": "This is a test response for short answer."}]
    })
    client.post(f"/api/attempts/{att_id_short}/finish")

    res_eval_short = client.get(f"/api/attempts/{att_id_short}/evaluations")
    eval_short = res_eval_short.json().get("results", [])[0]

    print("\n--- SHORT ANSWER EVALUATION ITEM ---")
    print("question_type:", eval_short.get("question_type"))
    print("question_text:", eval_short.get("question_text"))
    print("student_answer:", eval_short.get("student_answer"))
    print("correct_answer:", eval_short.get("correct_answer"))

    assert eval_short.get("question_type") == "short"
    assert eval_short.get("correct_answer") is not None, "Short Answer correct_answer must be present!"
    print("Short Answer verification passed cleanly!")

print("\nALL VERIFICATIONS PASSED SUCCESSFULLY!")
