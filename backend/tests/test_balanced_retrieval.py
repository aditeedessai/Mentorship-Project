import uuid
from backend.database.database import get_connection
from backend.database import study_set_repository
from backend.embeddings.retriever import retrieve_chunks
from backend.embeddings.vector_store import store_embeddings
from backend.quiz_generation.quiz_generator import find_best_matching_chunks


def _get_existing_user_id():
    """Retrieve a valid user_id from database if present, otherwise return None."""
    conn = get_connection()
    try:
        row = conn.execute("SELECT user_id FROM study_sets WHERE user_id IS NOT NULL LIMIT 1").fetchone()
        if row and row.get("user_id"):
            return str(row["user_id"])
    except Exception:
        pass
    finally:
        conn.close()
    return None


def _helper_create_doc_with_chunks(study_set_id: str, file_name: str, chunk_texts: list[str]) -> str:
    """Helper to register a document and insert text chunks with dummy embeddings into Postgres."""
    doc_id = str(uuid.uuid4())
    study_set_repository.create_document(
        document_id=doc_id,
        study_set_id=study_set_id,
        file_path=f"/fake/{file_name}",
        file_name=file_name
    )

    # Dummy 384-dimensional embeddings (matching SentenceTransformer all-MiniLM-L6-v2)
    embeddings = [[0.01 * (i + 1)] * 384 for i in range(len(chunk_texts))]
    store_embeddings(
        document_id=doc_id,
        chunks=chunk_texts,
        embeddings=embeddings,
        study_set_id=study_set_id
    )
    return doc_id


def test_1_multiple_documents_balanced_retrieval():
    """Test 1: Multiple documents (Doc A, Doc B, Doc C) return chunks from all 3 sources."""
    user_id = _get_existing_user_id()
    s_set = study_set_repository.create_study_set(study_set_id=str(uuid.uuid4()), name="Multi-Doc Test Set", user_id=user_id)
    set_id = s_set["study_set_id"]

    try:
        doc_a = _helper_create_doc_with_chunks(set_id, "doc_a.pdf", [f"Doc A content chunk {i}" for i in range(5)])
        doc_b = _helper_create_doc_with_chunks(set_id, "doc_b.pdf", [f"Doc B content chunk {i}" for i in range(5)])
        doc_c = _helper_create_doc_with_chunks(set_id, "doc_c.pdf", [f"Doc C content chunk {i}" for i in range(5)])

        retrieved = retrieve_chunks("Generate an exam quiz from study material", study_set_id=set_id, top_k=5)
        retrieved_doc_ids = set(c["document_id"] for c in retrieved)

        assert doc_a in retrieved_doc_ids, "Document A must be included in retrieved chunks"
        assert doc_b in retrieved_doc_ids, "Document B must be included in retrieved chunks"
        assert doc_c in retrieved_doc_ids, "Document C must be included in retrieved chunks"
    finally:
        study_set_repository.delete_study_set(set_id)


def test_2_documents_and_photos_balanced_retrieval():
    """Test 2: Documents + Photos (PDF A, PDF B, Photo C, Photo D) all contribute to retrieval."""
    user_id = _get_existing_user_id()
    s_set = study_set_repository.create_study_set(study_set_id=str(uuid.uuid4()), name="Docs and Photos Set", user_id=user_id)
    set_id = s_set["study_set_id"]

    try:
        pdf_a = _helper_create_doc_with_chunks(set_id, "notes_a.pdf", [f"PDF A text line {i}" for i in range(4)])
        pdf_b = _helper_create_doc_with_chunks(set_id, "notes_b.pdf", [f"PDF B text line {i}" for i in range(4)])
        photo_c = _helper_create_doc_with_chunks(set_id, "photo_c.png", [f"Photo C OCR text line {i}" for i in range(3)])
        photo_d = _helper_create_doc_with_chunks(set_id, "photo_d.jpg", [f"Photo D OCR text line {i}" for i in range(3)])

        retrieved = retrieve_chunks("Generate an exam quiz from study material", study_set_id=set_id, top_k=5)
        retrieved_doc_ids = set(c["document_id"] for c in retrieved)

        assert pdf_a in retrieved_doc_ids, "PDF A must be included in retrieved context"
        assert pdf_b in retrieved_doc_ids, "PDF B must be included in retrieved context"
        assert photo_c in retrieved_doc_ids, "Photo C must be included in retrieved context"
        assert photo_d in retrieved_doc_ids, "Photo D must be included in retrieved context"
    finally:
        study_set_repository.delete_study_set(set_id)


def test_3_large_document_vs_small_photo():
    """Test 3: Large PDF (50 chunks) vs Small Photo (1 chunk). Small photo MUST be included."""
    user_id = _get_existing_user_id()
    s_set = study_set_repository.create_study_set(study_set_id=str(uuid.uuid4()), name="Large vs Small Set", user_id=user_id)
    set_id = s_set["study_set_id"]

    try:
        large_pdf = _helper_create_doc_with_chunks(set_id, "large_textbook.pdf", [f"Large textbook chapter excerpt {i}" for i in range(50)])
        small_photo = _helper_create_doc_with_chunks(set_id, "handwritten_formula.png", ["Special Physics Formula E equals mc squared"])

        retrieved = retrieve_chunks("Physics formulas and textbook concepts", study_set_id=set_id, top_k=5)
        retrieved_doc_ids = set(c["document_id"] for c in retrieved)

        assert large_pdf in retrieved_doc_ids, "Large PDF must be included"
        assert small_photo in retrieved_doc_ids, "Small Photo MUST be included and not crowded out by large PDF"
    finally:
        study_set_repository.delete_study_set(set_id)


def test_4_extreme_imbalance_large_pdfs_and_small_photos():
    """Test 4: Extreme imbalance — PDF A (50 chunks), PDF B (50 chunks), Photo C (1 chunk), Photo D (1 chunk).
    Verifies Photo C AND Photo D are both included in the retrieval budget."""
    user_id = _get_existing_user_id()
    s_set = study_set_repository.create_study_set(study_set_id=str(uuid.uuid4()), name="Extreme Imbalance Set", user_id=user_id)
    set_id = s_set["study_set_id"]

    try:
        pdf_a = _helper_create_doc_with_chunks(set_id, "textbook_a.pdf", [f"Textbook A page content {i}" for i in range(50)])
        pdf_b = _helper_create_doc_with_chunks(set_id, "textbook_b.pdf", [f"Textbook B page content {i}" for i in range(50)])
        photo_c = _helper_create_doc_with_chunks(set_id, "snap_c.png", ["Photo C key definition of thermodynamics"])
        photo_d = _helper_create_doc_with_chunks(set_id, "snap_d.jpg", ["Photo D key diagram explanation of gravity"])

        retrieved = retrieve_chunks("Thermodynamics gravity and textbook definitions", study_set_id=set_id, top_k=5)
        retrieved_doc_ids = set(c["document_id"] for c in retrieved)

        assert photo_c in retrieved_doc_ids, "Photo C must not be crowded out by large PDFs"
        assert photo_d in retrieved_doc_ids, "Photo D must not be crowded out by large PDFs"
    finally:
        study_set_repository.delete_study_set(set_id)


def test_5_single_source_retrieval():
    """Test 5: Single source study set works cleanly."""
    user_id = _get_existing_user_id()
    s_set = study_set_repository.create_study_set(study_set_id=str(uuid.uuid4()), name="Single Source Set", user_id=user_id)
    set_id = s_set["study_set_id"]

    try:
        single_doc = _helper_create_doc_with_chunks(set_id, "alone_file.pdf", [f"Single document chunk {i}" for i in range(10)])

        retrieved = retrieve_chunks("Single document query", study_set_id=set_id, top_k=5)
        assert len(retrieved) > 0
        assert all(c["document_id"] == single_doc for c in retrieved)
    finally:
        study_set_repository.delete_study_set(set_id)


def test_6_user_and_study_set_isolation():
    """Test 6: User isolation — retrieval for Study Set 1 returns ZERO chunks from Study Set 2."""
    user_id = _get_existing_user_id()

    set_1 = study_set_repository.create_study_set(study_set_id=str(uuid.uuid4()), name="User 1 Set", user_id=user_id)
    set_2 = study_set_repository.create_study_set(study_set_id=str(uuid.uuid4()), name="User 2 Set", user_id=user_id)

    try:
        doc_1 = _helper_create_doc_with_chunks(set_1["study_set_id"], "u1_private.pdf", ["User 1 confidential data"])
        doc_2 = _helper_create_doc_with_chunks(set_2["study_set_id"], "u2_private.pdf", ["User 2 secret data"])

        retrieved_u1 = retrieve_chunks("confidential secret data", study_set_id=set_1["study_set_id"], top_k=5)
        retrieved_u1_doc_ids = set(c["document_id"] for c in retrieved_u1)

        assert doc_1 in retrieved_u1_doc_ids
        assert doc_2 not in retrieved_u1_doc_ids, "User 1 retrieval MUST NOT return chunks from User 2's study set"
    finally:
        study_set_repository.delete_study_set(set_1["study_set_id"])
        study_set_repository.delete_study_set(set_2["study_set_id"])


def test_7_source_traceability_preservation():
    """Test 7: Verify question-to-source traceability is preserved for multi-source questions."""
    doc_a = str(uuid.uuid4())
    doc_b = str(uuid.uuid4())
    set_id = str(uuid.uuid4())

    chunks = [
        {"id": "c1", "text": "Newtonian mechanics describes acceleration and force.", "document_id": doc_a, "study_set_id": set_id, "chunk_number": 0},
        {"id": "c2", "text": "Photosynthesis converts carbon dioxide and sunlight into glucose.", "document_id": doc_b, "study_set_id": set_id, "chunk_number": 0},
    ]

    matched_a = find_best_matching_chunks("What is Newtonian mechanics?", "Newtonian mechanics describes force", chunks)
    assert len(matched_a) > 0
    assert matched_a[0]["document_id"] == doc_a

    matched_b = find_best_matching_chunks("How does photosynthesis work?", "Photosynthesis converts glucose using sunlight", chunks)
    assert len(matched_b) > 0
    assert matched_b[0]["document_id"] == doc_b
