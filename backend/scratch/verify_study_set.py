import os
import sys
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROJECT_ROOT = ROOT.parent

for p in (str(PROJECT_ROOT), str(ROOT)):
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.database.database import init_db, get_connection
from backend.database.study_set_repository import (
    create_study_set,
    get_study_set,
    list_study_sets,
    create_document,
    get_documents_by_study_set,
    get_document_by_id,
)
from backend.database.quiz_repository import (
    save_questions,
    get_questions_by_study_set,
)
from backend.database.attempt_repository import (
    save_attempt,
    get_attempt,
    list_attempts,
)
from backend.embeddings.vector_store import store_embeddings
from backend.embeddings.retriever import retrieve_chunks
import numpy as np


def run_verification():
    print("1. Initializing database...", flush=True)
    init_db()
    conn = get_connection()
    tables = [row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
    conn.close()
    print("Tables found:", tables, flush=True)
    assert "study_sets" in tables, "study_sets table missing"
    assert "documents" in tables, "documents table missing"

    print("\n2. Testing study_set repository...", flush=True)
    s_id = f"test_set_{uuid.uuid4()}"
    create_study_set(s_id, "Test Physics Set")
    s_set = get_study_set(s_id)
    assert s_set is not None and s_set["name"] == "Test Physics Set"
    print("Study Set retrieved:", s_set, flush=True)

    print("\n3. Testing documents creation under study_set...", flush=True)
    d1_id = f"doc_{uuid.uuid4()}"
    d2_id = f"doc_{uuid.uuid4()}"
    d3_id = f"doc_{uuid.uuid4()}"
    doc1 = create_document(d1_id, s_id, "/path/doc1.pdf", "doc1.pdf")
    doc2 = create_document(d2_id, s_id, "/path/doc2.pdf", "doc2.pdf")
    doc3 = create_document(d3_id, s_id, "/path/doc3.pdf", "doc3.pdf")

    docs = get_documents_by_study_set(s_id)
    assert len(docs) == 3
    print(f"Retrieved {len(docs)} documents for study set {s_id}", flush=True)

    print("\n4. Testing Vector Store embedding storage with study_set_id...", flush=True)
    dummy_chunks_doc1 = ["Newton's first law of motion.", "Newton's second law F=ma."]
    dummy_chunks_doc2 = ["Newton's third law action reaction.", "Gravitational attraction equation."]
    dummy_chunks_doc3 = ["Work kinetic energy theorem.", "Conservation of mechanical energy."]

    dummy_emb_doc1 = np.random.rand(len(dummy_chunks_doc1), 384).astype(np.float32)
    dummy_emb_doc2 = np.random.rand(len(dummy_chunks_doc2), 384).astype(np.float32)
    dummy_emb_doc3 = np.random.rand(len(dummy_chunks_doc3), 384).astype(np.float32)

    store_embeddings(d1_id, dummy_chunks_doc1, dummy_emb_doc1, study_set_id=s_id)
    store_embeddings(d2_id, dummy_chunks_doc2, dummy_emb_doc2, study_set_id=s_id)
    store_embeddings(d3_id, dummy_chunks_doc3, dummy_emb_doc3, study_set_id=s_id)

    print("\n5. Testing Retriever with study_set_id...", flush=True)
    retrieved = retrieve_chunks("Newton motion energy", study_set_id=s_id, top_k=5)
    assert len(retrieved) > 0, "No chunks retrieved!"
    print("Retrieved chunks count:", len(retrieved), flush=True)

    print("\n6. Testing Quiz Repository with study_set_id...", flush=True)
    q1_id = f"q_{uuid.uuid4()}"
    q2_id = f"q_{uuid.uuid4()}"
    dummy_questions = [
        {
            "question_id": q1_id,
            "question_type": "mcq",
            "topic": "Physics",
            "question": "What is F in F=ma?",
            "reference_answer": "Force",
            "options": {"A": "Force", "B": "Mass", "C": "Acceleration", "D": "Velocity"},
            "correct_option": "A"
        },
        {
            "question_id": q2_id,
            "question_type": "short",
            "topic": "Energy",
            "question": "Define work done.",
            "reference_answer": "Force times displacement"
        }
    ]
    save_questions(study_set_id=s_id, questions=dummy_questions)
    saved_q = get_questions_by_study_set(s_id)
    assert len(saved_q) == 2, f"Expected 2 questions, got {len(saved_q)}"
    print("Questions retrieved by study_set_id:", saved_q, flush=True)

    print("\n7. Testing Quiz Attempt Repository with study_set_id...", flush=True)
    attempt_id = f"att_{uuid.uuid4()}"
    save_attempt(attempt_id=attempt_id, total_marks=12.0, marks_awarded=10.0, study_set_id=s_id)
    retrieved_att = get_attempt(attempt_id)
    assert retrieved_att is not None and retrieved_att["study_set_id"] == s_id
    print("Attempt retrieved by ID:", retrieved_att, flush=True)

    attempts_by_set = list_attempts(study_set_id=s_id)
    assert len(attempts_by_set) >= 1
    print("Attempts retrieved by study_set_id:", attempts_by_set, flush=True)

    print("\nALL VERIFICATION TESTS PASSED SUCCESSFULLY!", flush=True)


if __name__ == "__main__":
    run_verification()
