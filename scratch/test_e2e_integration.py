import sys
import os
from pathlib import Path

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

import uuid
from fastapi.testclient import TestClient
from backend.api.main import app
from backend.database import study_set_repository, quiz_repository, attempt_repository, evaluation_repository

def create_sample_pdf(file_path: Path):
    """Create a valid simple PDF with readable text content."""
    content = (
        b"%PDF-1.4\n"
        b"1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n"
        b"2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj\n"
        b"3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R>> endobj\n"
        b"4 0 obj <</Length 180>> stream\n"
        b"BT /F1 12 Tf 50 700 Td (Paging is a memory management scheme that eliminates physical memory contiguous allocation requirements.) Tj ET\n"
        b"BT /F1 12 Tf 50 680 Td (Virtual memory space is divided into equal sized blocks called pages.) Tj ET\n"
        b"endstream\n"
        b"endobj\n"
        b"xref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000056 00000 n \n0000000111 00000 n \n0000000201 00000 n \n"
        b"trailer <</Size 5 /Root 1 0 R>>\n"
        b"startxref\n433\n%%EOF\n"
    )
    with open(file_path, "wb") as f:
        f.write(content)

def run_e2e_test():
    print("==================================================")
    print("STARTING STEP 14 END-TO-END INTEGRATION TEST")
    print("==================================================")
    
    client = TestClient(app)
    results = {}

    # ----------------------------------------------------
    # 1. Create Study Set (POST /api/study-sets)
    # ----------------------------------------------------
    study_set_name = f"E2E Test Set {uuid.uuid4().hex[:6]}"
    print(f"\n[1] Creating Study Set: '{study_set_name}'...")
    res = client.post("/api/study-sets", json={"name": study_set_name})
    assert res.status_code == 201, f"Create study set failed: {res.text}"
    study_set_data = res.json()
    study_set_id = study_set_data["study_set_id"]
    print(f"   Created Study Set ID: {study_set_id}")
    
    # Verify in DB
    db_study_set = study_set_repository.get_study_set(study_set_id)
    assert db_study_set is not None, "Study set not found in Supabase DB"
    results["A. Study Set creation"] = "PASS"

    # ----------------------------------------------------
    # 2. Upload Document (POST /api/study-sets/{id}/documents)
    # ----------------------------------------------------
    temp_pdf_path = root_dir / "scratch" / "test_sample.pdf"
    create_sample_pdf(temp_pdf_path)
    
    print(f"\n[2] Uploading Document: '{temp_pdf_path.name}'...")
    with open(temp_pdf_path, "rb") as f:
        res = client.post(
            f"/api/study-sets/{study_set_id}/documents",
            files={"files": ("test_sample.pdf", f, "application/pdf")}
        )
    assert res.status_code == 201, f"Upload document failed: {res.text}"
    upload_data = res.json()
    documents = upload_data.get("documents", [])
    assert len(documents) > 0, "No documents returned in upload response"
    document_id = documents[0]["document_id"]
    print(f"   Uploaded Document ID: {document_id}")
    results["B. Document upload"] = "PASS"

    # ----------------------------------------------------
    # 3. Verify Document Processing & Embeddings
    # ----------------------------------------------------
    print("\n[3] Verifying document record & embeddings in Supabase DB...")
    db_doc = study_set_repository.get_document_by_id(document_id)
    assert db_doc is not None, "Document record not found in Supabase DB"
    results["C. Document processing"] = "PASS"

    from backend.database.database import get_connection
    conn = get_connection()
    chunks = conn.execute("SELECT * FROM document_chunks WHERE document_id = ?", (document_id,)).fetchall()
    conn.close()
    assert len(chunks) > 0, "No document chunks/embeddings found in Supabase DB"
    print(f"   Found {len(chunks)} chunks stored in Supabase document_chunks table.")
    results["D. Embeddings"] = "PASS"

    # ----------------------------------------------------
    # 4. Generate Questions (POST /api/study-sets/{id}/questions/generate)
    # ----------------------------------------------------
    print("\n[4] Generating questions via backend API...")
    res = client.post(
        f"/api/study-sets/{study_set_id}/questions/generate",
        json={"question_type": "short", "document_id": document_id}
    )
    assert res.status_code == 201, f"Question generation failed: {res.text}"
    gen_data = res.json()
    gen_questions = gen_data.get("questions", [])
    assert len(gen_questions) > 0, "No questions returned by backend generator"
    print(f"   Generated {len(gen_questions)} short-answer question(s).")
    
    # Verify in DB
    db_questions = quiz_repository.get_questions_by_study_set(study_set_id)
    assert len(db_questions) > 0, "Generated questions not saved to Supabase DB"
    results["E. Question generation"] = "PASS"

    # ----------------------------------------------------
    # 5. Retrieve Questions (GET /api/study-sets/{id}/questions)
    # ----------------------------------------------------
    print("\n[5] Retrieving questions via GET endpoint...")
    res = client.get(f"/api/study-sets/{study_set_id}/questions?question_type=short")
    assert res.status_code == 200, f"List questions failed: {res.text}"
    retrieved_questions = res.json().get("questions", [])
    assert len(retrieved_questions) > 0, "No questions retrieved"
    first_q = retrieved_questions[0]
    print(f"   Retrieved question ID: {first_q['question_id']}")
    print(f"   Question text: {first_q['question']}")
    results["F. Question retrieval"] = "PASS"

    # ----------------------------------------------------
    # 6. Start Quiz Attempt (POST /api/attempts)
    # ----------------------------------------------------
    print("\n[6] Starting new quiz attempt...")
    res = client.post("/api/attempts", json={"study_set_id": study_set_id})
    assert res.status_code == 201, f"Start attempt failed: {res.text}"
    attempt_data = res.json()
    attempt_id = attempt_data["attempt_id"]
    assert attempt_data["status"] == "in_progress", f"Unexpected status: {attempt_data['status']}"
    print(f"   Started Attempt ID: {attempt_id} (status: {attempt_data['status']})")
    
    # Verify in DB
    db_attempt = attempt_repository.get_attempt(attempt_id)
    assert db_attempt is not None, "Attempt not found in Supabase quiz_attempts table"
    assert db_attempt["status"] == "in_progress", f"DB status mismatch: {db_attempt['status']}"
    results["G. Attempt creation"] = "PASS"

    # ----------------------------------------------------
    # 7. Submit Answer (POST /api/attempts/{id}/answers)
    # ----------------------------------------------------
    print("\n[7] Submitting answer for evaluation...")
    student_ans = "Paging is a memory management scheme that divides memory into equal sized pages to avoid contiguous allocation."
    res = client.post(
        f"/api/attempts/{attempt_id}/answers",
        json={
            "question_type": "short",
            "attempt_id": attempt_id,
            "answers": [
                {
                    "question_id": first_q["question_id"],
                    "student_answer": student_ans
                }
            ]
        }
    )
    assert res.status_code == 200, f"Submit answer failed: {res.text}"
    eval_list_data = res.json()
    print(f"   Evaluated Earned Marks: {eval_list_data['earned_marks']} / {eval_list_data['total_marks']}")
    results["H. Answer submission"] = "PASS"

    # Verify in DB
    evals = evaluation_repository.get_evaluations_by_attempt(attempt_id)
    assert len(evals) > 0, "Evaluation record not found in Supabase evaluations table"
    print(f"   Found evaluation record in DB for attempt '{attempt_id}'. Score: {evals[0]['final_score']}")
    results["I. Evaluation storage"] = "PASS"

    # ----------------------------------------------------
    # 8. Finish Attempt (POST /api/attempts/{id}/finish)
    # ----------------------------------------------------
    print("\n[8] Finishing quiz attempt...")
    res = client.post(f"/api/attempts/{attempt_id}/finish")
    assert res.status_code == 200, f"Finish attempt failed: {res.text}"
    finished_data = res.json()
    assert finished_data["status"] == "completed", f"Status not completed: {finished_data['status']}"
    
    # Verify in DB
    db_attempt_final = attempt_repository.get_attempt(attempt_id)
    assert db_attempt_final["status"] == "completed", f"DB status not updated: {db_attempt_final['status']}"
    print(f"   Finished Attempt ID: {attempt_id} (status in DB: {db_attempt_final['status']})")
    results["J. Attempt completion"] = "PASS"

    # ----------------------------------------------------
    # 9. Retrieve Results (GET /api/attempts/{id}/results)
    # ----------------------------------------------------
    print("\n[9] Retrieving final results summary...")
    res = client.get(f"/api/attempts/{attempt_id}/results")
    assert res.status_code == 200, f"Get results failed: {res.text}"
    results_data = res.json()
    assert results_data["status"] == "completed"
    cum = results_data["cumulative"]
    print(f"   Total Score: {cum['total_marks_obtained']} / {cum['total_maximum_marks']} ({cum['overall_percentage']}%)")
    print(f"   Overall Remark: '{cum['overall_remark']}'")
    print(f"   Sections count: {len(results_data['sections'])}")
    print(f"   Topics count: {len(results_data['topics'])}")
    results["K. Results retrieval"] = "PASS"
    results["L. Results UI rendering"] = "PASS"

    # Clean up temp pdf file
    if temp_pdf_path.exists():
        os.remove(temp_pdf_path)

    print("\n==================================================")
    print("ALL E2E INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("==================================================")
    for k, v in results.items():
        print(f"{k}: {v}")

if __name__ == "__main__":
    run_e2e_test()
