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
from backend.database.study_set_repository import create_study_set, create_document
from backend.database.quiz_repository import (
    save_questions,
    get_questions_by_study_set,
    get_questions_by_document,
    get_question_sources,
)
from backend.quiz_generation.quiz_generator import find_best_matching_chunks


def run_tests():
    print("=" * 70, flush=True)
    print("      RUNNING QUESTION SOURCE TRACEABILITY TEST SUITE", flush=True)
    print("=" * 70, flush=True)

    init_db()

    # -------------------------------------------------------------------
    # TEST 1: Single Document Upload
    # -------------------------------------------------------------------
    print("\n--- TEST 1: Single Document Traceability ---", flush=True)
    s_id_1 = f"set_{uuid.uuid4()}"
    create_study_set(s_id_1, "Single Doc Study Set")
    d_id_1 = f"doc_single_{uuid.uuid4()}"
    create_document(d_id_1, s_id_1, "/path/physics.pdf", "physics.pdf")

    chunks_1 = [
        {"id": f"{d_id_1}_0", "text": "Newtonian mechanics describes kinematics and forces.", "document_id": d_id_1, "study_set_id": s_id_1, "chunk_number": 0},
        {"id": f"{d_id_1}_1", "text": "Thermodynamics governs heat energy and entropy.", "document_id": d_id_1, "study_set_id": s_id_1, "chunk_number": 1}
    ]

    q1_1 = {
        "question_id": f"q_{uuid.uuid4()}",
        "question_type": "mcq",
        "topic": "Kinematics",
        "question": "What branch of physics describes kinematics and forces?",
        "reference_answer": "Newtonian mechanics describes kinematics and forces.",
        "options": {"A": "Quantum", "B": "Newtonian mechanics", "C": "Optics", "D": "Acoustics"},
        "correct_option": "B"
    }

    matched_1 = find_best_matching_chunks(q1_1["question"], q1_1["reference_answer"], chunks_1)
    q1_1["source_chunk_ids"] = [c["id"] for c in matched_1]
    q1_1["source_document_ids"] = list(dict.fromkeys(c["document_id"] for c in matched_1))
    q1_1["sources_tuples"] = [(c["document_id"], c["id"]) for c in matched_1]

    save_questions(study_set_id=s_id_1, questions=[q1_1])

    retrieved_q1 = get_questions_by_study_set(s_id_1)
    assert len(retrieved_q1) == 1
    assert d_id_1 in retrieved_q1[0]["source_document_ids"]
    assert retrieved_q1[0]["sources"][0]["document_id"] == d_id_1
    print("Test 1 PASSED: Question correctly references single source document", d_id_1, flush=True)

    # -------------------------------------------------------------------
    # TEST 2: Two Documents Traceability
    # -------------------------------------------------------------------
    print("\n--- TEST 2: Two Documents Traceability ---", flush=True)
    s_id_2 = f"set_{uuid.uuid4()}"
    create_study_set(s_id_2, "Two Doc Study Set")
    doc_phys = f"doc_physics_{uuid.uuid4()}"
    doc_chem = f"doc_chem_{uuid.uuid4()}"
    create_document(doc_phys, s_id_2, "/path/physics.pdf", "physics.pdf")
    create_document(doc_chem, s_id_2, "/path/chemistry.pdf", "chemistry.pdf")

    chunks_2 = [
        {"id": f"{doc_phys}_0", "text": "Einstein relativity equation E equals mc squared.", "document_id": doc_phys, "study_set_id": s_id_2, "chunk_number": 0},
        {"id": f"{doc_chem}_0", "text": "Avogadro constant is 6.022 times 10 to 23 per mole.", "document_id": doc_chem, "study_set_id": s_id_2, "chunk_number": 0}
    ]

    q_phys = {
        "question_id": f"q_{uuid.uuid4()}",
        "question_type": "short",
        "topic": "Relativity",
        "question": "What is Einstein's famous equation?",
        "reference_answer": "E equals mc squared in relativity."
    }
    q_chem = {
        "question_id": f"q_{uuid.uuid4()}",
        "question_type": "short",
        "topic": "Mole Concept",
        "question": "What is the value of Avogadro constant?",
        "reference_answer": "6.022 times 10 to 23 per mole."
    }

    for q in [q_phys, q_chem]:
        matched = find_best_matching_chunks(q["question"], q["reference_answer"], chunks_2)
        q["source_chunk_ids"] = [c["id"] for c in matched]
        q["source_document_ids"] = list(dict.fromkeys(c["document_id"] for c in matched))
        q["sources_tuples"] = [(c["document_id"], c["id"]) for c in matched]

    save_questions(study_set_id=s_id_2, questions=[q_phys, q_chem])

    questions_phys = get_questions_by_document(doc_phys)
    questions_chem = get_questions_by_document(doc_chem)

    assert len(questions_phys) == 1
    assert questions_phys[0]["sources"][0]["document_id"] == doc_phys
    assert len(questions_chem) == 1
    assert questions_chem[0]["sources"][0]["document_id"] == doc_chem
    print("Test 2 PASSED: Questions mapped to distinct source documents (Physics & Chemistry)", flush=True)

    # -------------------------------------------------------------------
    # TEST 3: Three Documents (No Defaulting to Document 1)
    # -------------------------------------------------------------------
    print("\n--- TEST 3: Three Documents (No Defaulting to Doc 1) ---", flush=True)
    s_id_3 = f"set_{uuid.uuid4()}"
    create_study_set(s_id_3, "Three Doc Study Set")
    d1 = f"doc_A_{uuid.uuid4()}"
    d2 = f"doc_B_{uuid.uuid4()}"
    d3 = f"doc_C_{uuid.uuid4()}"

    create_document(d1, s_id_3, "/path/doc1.pdf", "doc1.pdf")
    create_document(d2, s_id_3, "/path/doc2.pdf", "doc2.pdf")
    create_document(d3, s_id_3, "/path/doc3.pdf", "doc3.pdf")

    chunks_3 = [
        {"id": f"{d1}_0", "text": "Topic Alpha details.", "document_id": d1, "study_set_id": s_id_3, "chunk_number": 0},
        {"id": f"{d2}_0", "text": "Topic Beta details and mechanisms.", "document_id": d2, "study_set_id": s_id_3, "chunk_number": 0},
        {"id": f"{d3}_0", "text": "Topic Gamma details and observations.", "document_id": d3, "study_set_id": s_id_3, "chunk_number": 0}
    ]

    q_beta = {
        "question_id": f"q_{uuid.uuid4()}",
        "question_type": "application",
        "topic": "Beta",
        "question": "Explain Topic Beta mechanisms.",
        "reference_answer": "Topic Beta details and mechanisms."
    }

    matched_beta = find_best_matching_chunks(q_beta["question"], q_beta["reference_answer"], chunks_3)
    q_beta["source_chunk_ids"] = [c["id"] for c in matched_beta]
    q_beta["source_document_ids"] = list(dict.fromkeys(c["document_id"] for c in matched_beta))
    q_beta["sources_tuples"] = [(c["document_id"], c["id"]) for c in matched_beta]

    save_questions(study_set_id=s_id_3, questions=[q_beta])

    retrieved_beta = get_questions_by_study_set(s_id_3)
    sources = get_question_sources(retrieved_beta[0]["question_id"])
    source_docs = [s["document_id"] for s in sources]

    assert d1 not in source_docs, f"Question incorrectly defaulted to doc 1 ({d1})!"
    assert d2 in source_docs, f"Question failed to link to doc 2 ({d2})!"
    print("Test 3 PASSED: Question linked strictly to doc 2 and did NOT default to doc 1", flush=True)

    # -------------------------------------------------------------------
    # TEST 4: Multi-Document Source Traceability
    # -------------------------------------------------------------------
    print("\n--- TEST 4: Multi-Document Source Traceability ---", flush=True)
    s_id_4 = f"set_{uuid.uuid4()}"
    create_study_set(s_id_4, "Multi Doc Study Set")
    d_x = f"doc_X_{uuid.uuid4()}"
    d_y = f"doc_Y_{uuid.uuid4()}"

    create_document(d_x, s_id_4, "/path/docX.pdf", "docX.pdf")
    create_document(d_y, s_id_4, "/path/docY.pdf", "docY.pdf")

    c_x = {"id": f"{d_x}_0", "text": "Neural networks use backpropagation gradient descent.", "document_id": d_x, "study_set_id": s_id_4, "chunk_number": 0}
    c_y = {"id": f"{d_y}_0", "text": "Convolutional layers perform spatial feature extraction.", "document_id": d_y, "study_set_id": s_id_4, "chunk_number": 0}

    q_multi = {
        "question_id": f"q_{uuid.uuid4()}",
        "question_type": "long",
        "topic": "Deep Learning",
        "question": "Discuss how neural networks use backpropagation alongside convolutional layers spatial feature extraction.",
        "reference_answer": "Neural networks use backpropagation gradient descent while convolutional layers perform spatial feature extraction.",
        "source_chunk_ids": [c_x["id"], c_y["id"]],
        "source_document_ids": [d_x, d_y],
        "sources_tuples": [(d_x, c_x["id"]), (d_y, c_y["id"])]
    }

    save_questions(study_set_id=s_id_4, questions=[q_multi])

    sources_multi = get_question_sources(q_multi["question_id"])
    docs_linked = set(s["document_id"] for s in sources_multi)
    chunks_linked = set(s["chunk_id"] for s in sources_multi)

    assert d_x in docs_linked and d_y in docs_linked, "Failed to link both source documents!"
    assert c_x["id"] in chunks_linked and c_y["id"] in chunks_linked, "Failed to link both source chunks!"
    print("Test 4 PASSED: Multi-document question linked to both source documents and source chunks in canonical question_sources", flush=True)

    print("\n" + "=" * 70, flush=True)
    print("      ALL TRACEABILITY TESTS PASSED SUCCESSFULLY!", flush=True)
    print("=" * 70, flush=True)


if __name__ == "__main__":
    run_tests()
