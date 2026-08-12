import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent

if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.database.database import init_db
from backend.services.document_service import process_pdf
from backend.services.quiz_service import run_quiz
from backend.services.evaluation_service import run_evaluation


def prompt_for_document_path() -> str:
    return input("\nEnter path to document (PDF, DOCX, PPTX): ").strip().strip('"')


def validate_document_path(file_path: str) -> str:
    if not file_path:
        raise ValueError("Document path cannot be empty.")
    return file_path


def run_study_flow(file_path: str) -> None:
    document_id = process_pdf(file_path)
    questions = run_quiz(document_id)

    if not questions:
        raise RuntimeError("Gemini returned no questions.")

    run_evaluation(questions, document_id)


def main() -> None:
    print("=" * 70)
    print("                 STUDY ENGINE - POC")
    print("=" * 70)

    init_db()

    file_path = prompt_for_document_path()
    validated_path = validate_document_path(file_path)
    run_study_flow(validated_path)


if __name__ == "__main__":
    main()