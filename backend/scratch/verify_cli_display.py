import sys
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROJECT_ROOT = ROOT.parent

for p in (str(PROJECT_ROOT), str(ROOT)):
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.services.quiz_service import display_generated_questions

def test_cli_display():
    doc_id_1 = f"doc_{uuid.uuid4()}"
    doc_id_2 = f"doc_{uuid.uuid4()}"
    
    mock_questions = [
        {
            "question_id": str(uuid.uuid4()),
            "question_type": "mcq",
            "topic": "Relational Databases",
            "question": "What is the primary key in a relational database?",
            "options": {
                "A": "A unique identifier for a row",
                "B": "A duplicate value column",
                "C": "A foreign key reference",
                "D": "A null value column"
            },
            "correct_option": "A",
            "reference_answer": "A primary key uniquely identifies each record/row in a database table.",
            "source_document_ids": [doc_id_1],
            "source_chunk_ids": [f"{doc_id_1}_chunk_0"]
        },
        {
            "question_id": str(uuid.uuid4()),
            "question_type": "mcq",
            "topic": "Normal Forms",
            "question": "Which normal form removes partial dependencies?",
            "options": {
                "A": "1NF",
                "B": "2NF",
                "C": "3NF",
                "D": "BCNF"
            },
            "correct_option": "B",
            "reference_answer": "Second Normal Form (2NF) eliminates partial functional dependencies.",
            "source_document_ids": [doc_id_1, doc_id_2],
            "source_chunk_ids": [f"{doc_id_1}_chunk_1", f"{doc_id_2}_chunk_0"]
        },
        {
            "question_id": str(uuid.uuid4()),
            "question_type": "application",
            "topic": "Indexing",
            "question": "Explain how B-Tree indexing optimizes read queries in a large SQL table.",
            "reference_answer": "B-Tree indexes reduce disk I/O operations from O(N) full table scan to O(log N) tree traversal.",
            "source_document_ids": [doc_id_2],
            "source_chunk_ids": [f"{doc_id_2}_chunk_1"]
        },
        {
            "question_id": str(uuid.uuid4()),
            "question_type": "short",
            "topic": "ACID Properties",
            "question": "What does Atomicity mean in database transactions?",
            "reference_answer": "Atomicity ensures that all operations within a transaction succeed or none are applied ('all-or-nothing').",
            "source_document_ids": [doc_id_1],
            "source_chunk_ids": [f"{doc_id_1}_chunk_2"]
        },
        {
            "question_id": str(uuid.uuid4()),
            "question_type": "long",
            "topic": "Concurrency Control",
            "question": "Compare Two-Phase Locking (2PL) with Multi-Version Concurrency Control (MVCC).",
            "reference_answer": "2PL uses shared/exclusive locks preventing dirty reads but causing locking overhead. MVCC creates snapshots allowing readers not to block writers.",
            "source_document_ids": [doc_id_2],
            "source_chunk_ids": [f"{doc_id_2}_chunk_2", f"{doc_id_2}_chunk_3"]
        }
    ]

    print("TESTING CLI DISPLAY OF ALL 5 GENERATED QUESTIONS WITH METADATA", flush=True)
    display_generated_questions(mock_questions)

    # Verify internal dictionary objects still retain source traceability metadata
    for q in mock_questions:
        assert "source_document_ids" in q and len(q["source_document_ids"]) > 0
        assert "source_chunk_ids" in q and len(q["source_chunk_ids"]) > 0
    
    print("\n[VERIFICATION SUCCESSFUL] Internal metadata fields retained on all questions!", flush=True)

if __name__ == "__main__":
    test_cli_display()
