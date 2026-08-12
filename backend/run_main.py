import os
import sys
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent

if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


from backend.database.database import init_db
from backend.services.document_service import process_pdf
from backend.services.quiz_service import run_quiz
from backend.services.evaluation_service import run_evaluation
from backend.database.database import init_db
from backend.document_processing.extracter import extract_text
from backend.document_processing.cleaner import clean_text
from backend.document_processing.chunker import chunk_text
from backend.embeddings.embedding_model import generate_embeddings
from backend.embeddings.vector_store import store_embeddings

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".pptx", ".ppt"}
REJECTED_EXTENSIONS = {
    ".mp3", ".mp4", ".wav", ".avi", ".mov", ".m4a", ".mkv", ".flac", ".ogg", ".webm"
}



def process_pdf(pdf_path: str) -> str:
    path = Path(pdf_path).expanduser().resolve()
    if not path.exists():
        raise FileNotFoundError(f"File not found: {path}")
    if not path.is_file():
        raise ValueError("Please provide a valid file.")

    # Check for forbidden or unsupported file formats
    ext = path.suffix.lower()
    if ext in REJECTED_EXTENSIONS:
        raise ValueError(f"Unsupported file type '{ext}'. Audio and video files are not allowed.")
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported file type '{ext}'. Allowed formats: PDF, PPT/PPTX, DOC/DOCX.")

    print(f"\n[1/4] Extracting and preprocessing {path.suffix or 'uploaded'} file...")
    text = extract_text(str(path))
    if not text.strip():
        raise ValueError("No text could be extracted from the uploaded file.")

    cleaned = clean_text(text)
    chunks = [c for c in chunk_text(cleaned) if c.strip()]
    print(f"      Extracted {len(text):,} characters")
    print(f"      Created {len(chunks)} chunks")

    print("\n[2/4] Generating SBERT embeddings and storing them...")
    document_id = str(uuid.uuid4())
    embeddings = generate_embeddings(chunks)
    store_embeddings(document_id, chunks, embeddings)
    print(f"      Document ID: {document_id}")

    return document_id


def main():
    print("=" * 70)
    print("                 STUDY ENGINE - POC")
    print("              VS CODE / PYTHON ONLY")
    print("=" * 70)

    init_db()

    # Prompt user for any supported document format
    file_path = input("\nEnter path to document (PDF, DOCX, PPTX): ").strip().strip('"')
    document_id = process_pdf(file_path)
    questions = run_quiz(document_id)

    if not questions:
        raise RuntimeError("Gemini returned no questions.")

    run_evaluation(questions, document_id)


if __name__ == "__main__":
    main()
