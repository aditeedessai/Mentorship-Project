from pathlib import Path
import uuid

from backend.document_processing.extractor import (
    extract_text,
    SUPPORTED_EXTENSIONS
)
from backend.document_processing.cleaner import clean_text
from backend.document_processing.chunker import chunk_text

from backend.embeddings.embedding_model import generate_embeddings
from backend.embeddings.vector_store import store_embeddings
from backend.database.study_set_repository import create_study_set, create_document, get_study_set


def process_pdf(pdf_path: str, study_set_id: str = None) -> str:
    """
    Process a study-material PDF/DOCX/PPTX file under a study set.

    Workflow:
    1. Validate file
    2. Ensure study_set exists (create if not provided)
    3. Extract text
    4. Clean text
    5. Create chunks
    6. Register document record in SQLite
    7. Generate SBERT embeddings
    8. Store embeddings in Supabase (document_chunks) with document_id and study_set_id

    Returns:
        document_id: Unique ID for the uploaded document.
    """

    path = Path(pdf_path).expanduser().resolve()

    # ---------------------------------------------------------
    # Validate file
    # ---------------------------------------------------------

    if not path.exists():
        raise FileNotFoundError(
            f"PDF not found: {path}"
        )

    allowed_extensions = SUPPORTED_EXTENSIONS
    if path.suffix.lower() not in allowed_extensions:
        raise ValueError(
            f"Unsupported file type '{path.suffix}'. Allowed formats: PDF, DOCX, PPTX."
        )

    # Ensure study set exists
    if not study_set_id:
        study_set_id = str(uuid.uuid4())
        create_study_set(
            study_set_id=study_set_id,
            name=path.stem
        )
    else:
        # Check if study set exists in DB; if not, create it
        if get_study_set(study_set_id) is None:
            create_study_set(
                study_set_id=study_set_id,
                name=path.stem
            )

    # ---------------------------------------------------------
    # Extract text
    # ---------------------------------------------------------

    print("\n[1/4] Extracting and preprocessing PDF...")

    text = extract_text(str(path))

    if not text.strip():
        raise ValueError(
            "No text could be extracted from the PDF."
        )

    # ---------------------------------------------------------
    # Clean text
    # ---------------------------------------------------------

    cleaned_text = clean_text(text)

    # ---------------------------------------------------------
    # Create chunks
    # ---------------------------------------------------------

    chunks = [
        chunk
        for chunk in chunk_text(cleaned_text)
        if chunk.strip()
    ]

    print(
        f"      Extracted {len(text):,} characters"
    )

    print(
        f"      Created {len(chunks)} chunks"
    )

    # ---------------------------------------------------------
    # Generate embeddings & Register document
    # ---------------------------------------------------------

    print(
        "\n[2/4] Generating SBERT embeddings and storing them..."
    )

    document_id = str(uuid.uuid4())

    # Register document in database
    create_document(
        document_id=document_id,
        study_set_id=study_set_id,
        file_path=str(path),
        file_name=path.name
    )

    embeddings = generate_embeddings(chunks)

    # ---------------------------------------------------------
    # Store in Supabase (document_chunks)
    # ---------------------------------------------------------

    store_embeddings(
        document_id=document_id,
        chunks=chunks,
        embeddings=embeddings,
        study_set_id=study_set_id
    )

    print(
        f"      Study Set ID: {study_set_id}"
    )
    print(
        f"      Document ID : {document_id}"
    )

    return document_id


def create_study_set_from_files(file_paths: list[str], name: str = None) -> tuple[str, list[str]]:
    """
    Create a new study set and process multiple study-material files under it.

    Returns:
        tuple (study_set_id, list of document_ids)
    """
    if not file_paths:
        raise ValueError("No files were provided.")

    first_path = Path(file_paths[0]).expanduser().resolve()
    if not name:
        if len(file_paths) == 1:
            name = first_path.stem
        else:
            name = f"{first_path.stem} and {len(file_paths) - 1} other file(s)"

    study_set_id = str(uuid.uuid4())
    create_study_set(
        study_set_id=study_set_id,
        name=name
    )

    document_ids = []
    for file_path in file_paths:
        print(f"\nProcessing file under Study Set '{name}': {file_path}")
        doc_id = process_pdf(file_path, study_set_id=study_set_id)
        document_ids.append(doc_id)

    print(
        f"\nSuccessfully processed {len(document_ids)} file(s) under Study Set '{study_set_id}'."
    )

    return study_set_id, document_ids


def process_multiple_files(file_paths: list[str]) -> tuple[str, list[str]]:
    """
    Process multiple study-material files as a single Study Set.

    Returns:
        tuple (study_set_id, document_ids)
    """
    return create_study_set_from_files(file_paths)