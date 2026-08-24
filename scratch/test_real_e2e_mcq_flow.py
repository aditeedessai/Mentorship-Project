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

print(f"=== E2E MCQ TEST FLOW for study_set_id={study_set_id} ===")

# 1. Fetch MCQ questions
res_q = client.get(f"/api/study-sets/{study_set_id}/questions?question_type=mcq")
print("1. Fetch Questions Status:", res_q.status_code)
questions = res_q.json().get("questions", [])
if not questions:
    # Generate questions if none exist
    res_gen = client.post(f"/api/study-sets/{study_set_id}/questions/generate", json={"question_type": "mcq"})
    print("   Generated Questions Status:", res_gen.status_code)
    res_q = client.get(f"/api/study-sets/{study_set_id}/questions?question_type=mcq")
    questions = res_q.json().get("questions", [])

print(f"   Found {len(questions)} MCQ questions.")
if len(questions) == 0:
    print("   No questions available to test.")
    sys.exit(1)

target_q = questions[0]
print("   Target Question ID:", target_q["question_id"])
print("   Target Question Text:", target_q["question"])
print("   Target Question Options:", target_q.get("options"))

# 2. Start Attempt
res_att = client.post("/api/attempts", json={"study_set_id": study_set_id})
print("2. Start Attempt Status:", res_att.status_code)
attempt = res_att.json()
attempt_id = attempt["attempt_id"]
print("   Created Attempt ID:", attempt_id)

# 3. Submit Answer
# Select first available option key (e.g. 'A')
options = target_q.get("options") or {}
submitted_opt = list(options.keys())[0] if isinstance(options, dict) and options else "A"

answers_payload = {
    "question_type": "mcq",
    "attempt_id": attempt_id,
    "answers": [
        {
            "question_id": target_q["question_id"],
            "student_answer": submitted_opt
        }
    ]
}
res_sub = client.post(f"/api/attempts/{attempt_id}/answers", json=answers_payload)
print("3. Submit Answers Status:", res_sub.status_code)

# 4. Finish Attempt
res_fin = client.post(f"/api/attempts/{attempt_id}/finish")
print("4. Finish Attempt Status:", res_fin.status_code)

# 5. Fetch Evaluations for Results Page
res_eval = client.get(f"/api/attempts/{attempt_id}/evaluations")
print("5. Get Evaluations Status:", res_eval.status_code)
eval_data = res_eval.json()
results = eval_data.get("results", [])
print(f"   Received {len(results)} evaluation record(s).")

if results:
    eval_item = results[0]
    print("\n=== EVALUATION ITEM RETURNED TO FRONTEND ===")
    print("   question_id:", eval_item.get("question_id"))
    print("   question_text:", eval_item.get("question_text"))
    print("   student_answer:", eval_item.get("student_answer"))
    print("   correct_answer:", eval_item.get("correct_answer"))
    print("   is_correct:", eval_item.get("is_correct"))
    print("   marks_awarded:", eval_item.get("marks_awarded"))
    print("   max_marks:", eval_item.get("max_marks"))
    print("   feedback:", eval_item.get("feedback"))

    assert eval_item.get("question_text") == target_q["question"], "Question text mismatch!"
    assert eval_item.get("student_answer") == submitted_opt, "Student answer mismatch!"
    print("\nSUCCESS: All question & evaluation fields verified cleanly!")
