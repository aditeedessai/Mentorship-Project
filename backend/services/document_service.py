from pathlib import Path
import uuid

from backend.document_processing.extractor import extract_text
from backend.document_processing.cleaner import clean_text
from backend.document_processing.chunker import chunk_text

from backend.embeddings.embedding_model import generate_embeddings
from backend.embeddings.vector_store import store_embeddings


def process_pdf(pdf_path: str) -> str:
    """
    Process a study-material PDF.

    Workflow:
    1. Validate PDF
    2. Extract text
    3. Clean text
    4. Create chunks
    5. Generate SBERT embeddings
    6. Store embeddings in ChromaDB

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

    if path.suffix.lower() != ".pdf":
        raise ValueError(
            "Please provide a PDF file."
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
    # Generate embeddings
    # ---------------------------------------------------------

    print(
        "\n[2/4] Generating SBERT embeddings and storing them..."
    )

    document_id = str(uuid.uuid4())

    embeddings = generate_embeddings(chunks)

    # ---------------------------------------------------------
    # Store in ChromaDB
    # ---------------------------------------------------------

    store_embeddings(
        document_id=document_id,
        chunks=chunks,
        embeddings=embeddings
    )

    print(
        f"      Document ID: {document_id}"
    )

    return document_id