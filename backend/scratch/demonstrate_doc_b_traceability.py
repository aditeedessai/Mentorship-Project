import sys
import uuid
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROJECT_ROOT = ROOT.parent

for p in (str(PROJECT_ROOT), str(ROOT)):
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.database.database import init_db, get_connection
from backend.database.study_set_repository import create_study_set, create_document
from backend.database.quiz_repository import save_questions, get_question_by_id, get_question_sources
from backend.quiz_generation.quiz_generator import find_best_matching_chunks


def demonstrate():
    init_db()

    study_set_id = f"set_{uuid.uuid4()}"
    create_study_set(study_set_id, "Demo Multi-Doc Study Set")

    doc_a_id = f"doc_A_{uuid.uuid4()}"
    doc_b_id = f"doc_B_{uuid.uuid4()}"
    doc_c_id = f"doc_C_{uuid.uuid4()}"

    create_document(doc_a_id, study_set_id, "/path/docA.pdf", "docA.pdf")
    create_document(doc_b_id, study_set_id, "/path/docB.pdf", "docB.pdf")
    create_document(doc_c_id, study_set_id, "/path/docC.pdf", "docC.pdf")

    chunks = [
        {
            "id": f"{doc_a_id}_0",
            "text": "Document A details Quantum Superposition and Entanglement.",
            "document_id": doc_a_id,
            "study_set_id": study_set_id,
            "chunk_number": 0
        },
        {
            "id": f"{doc_b_id}_0",
            "text": "Document B details Relational Database Normalization and BCNF third normal form rules.",
            "document_id": doc_b_id,
            "study_set_id": study_set_id,
            "chunk_number": 0
        },
        {
            "id": f"{doc_c_id}_0",
            "text": "Document C details Photosynthesis light dependent reactions and Calvin cycle.",
            "document_id": doc_c_id,
            "study_set_id": study_set_id,
            "chunk_number": 0
        }
    ]

    # Question generated from Document B content
    raw_question_b = {
        "question_type": "mcq",
        "topic": "Database Normalization",
        "question": "What normal form removes transitive dependencies in relational database normalization?",
        "reference_answer": "BCNF third normal form rules eliminate transitive dependencies in database normalization.",
        "options": {"A": "1NF", "B": "2NF", "C": "3NF / BCNF", "D": "4NF"},
        "correct_option": "C"
    }

    # Deterministic matching
    matched_chunks = find_best_matching_chunks(
        raw_question_b["question"],
        raw_question_b["reference_answer"],
        chunks
    )

    question_id = f"q_{uuid.uuid4()}"
    raw_question_b["question_id"] = question_id
    raw_question_b["study_set_id"] = study_set_id
    raw_question_b["marks"] = 2.0

    resolved_chunk_ids = [c["id"] for c in matched_chunks]
    resolved_doc_ids = list(dict.fromkeys(c["document_id"] for c in matched_chunks))

    raw_question_b["source_chunk_ids"] = resolved_chunk_ids
    raw_question_b["source_document_ids"] = resolved_doc_ids
    raw_question_b["sources_tuples"] = [(c["document_id"], c["id"]) for c in matched_chunks]
    if resolved_doc_ids:
        raw_question_b["document_id"] = resolved_doc_ids[0]

    # Save to SQLite
    save_questions(study_set_id=study_set_id, questions=[raw_question_b])

    # Query back from SQLite database
    saved_q = get_question_by_id(question_id)

    conn = get_connection()
    full_chain = conn.execute(
        """
        SELECT 
            qs.question_id,
            q.question,
            qs.chunk_id,
            qs.document_id,
            d.file_name,
            d.study_set_id,
            s.name as study_set_name
        FROM question_sources qs
        JOIN questions q ON qs.question_id = q.question_id
        JOIN documents d ON qs.document_id = d.document_id
        JOIN study_sets s ON d.study_set_id = s.study_set_id
        WHERE qs.question_id = ?
        """,
        (question_id,)
    ).fetchall()
    conn.close()

    print("=" * 70, flush=True)
    print("      DEMONSTRATION: QUESTION GENERATED FROM DOCUMENT B", flush=True)
    print("=" * 70, flush=True)
    print(f"\nQuestion ID       : {saved_q['question_id']}", flush=True)
    print(f"Question Text     : {saved_q['question']}", flush=True)
    print(f"Primary doc_id    : {saved_q['document_id']}", flush=True)
    print(f"source_doc_ids    : {saved_q['source_document_ids']}", flush=True)
    print(f"source_chunk_ids  : {saved_q['source_chunk_ids']}", flush=True)

    print("\n--- CANONICAL JOIN TABLE (question_sources) RELATIONAL CHAIN ---", flush=True)
    for row in full_chain:
        r = dict(row)
        print(f"  question_id  : {r['question_id']}", flush=True)
        print(f"  -> chunk_id   : {r['chunk_id']}", flush=True)
        print(f"  -> document_id: {r['document_id']} ({r['file_name']})", flush=True)
        print(f"  -> study_set  : {r['study_set_id']} ('{r['study_set_name']}')", flush=True)
        print("-" * 50, flush=True)


if __name__ == "__main__":
    demonstrate()
