import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = ROOT.parent

for p in (str(PROJECT_ROOT), str(ROOT)):
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from backend.database.database import init_db
    from backend.services.document_service import process_pdf
    from backend.services.quiz_service import run_quiz
    from backend.services.evaluation_service import run_evaluation
except ModuleNotFoundError:
    from database.database import init_db
    from services.document_service import process_pdf
    from services.quiz_service import run_quiz
    from services.evaluation_service import run_evaluation


def prompt_for_document_path() -> str:
    return input(
        "\nEnter path to document (PDF, DOCX, PPTX): "
    ).strip().strip('"')


def validate_document_path(file_path: str) -> str:
    if not file_path:
        raise ValueError("Document path cannot be empty.")

    return file_path


def select_question_type() -> str:
    print("\nSelect Question Type:")
    print("1. MCQ")
    print("2. Application")
    print("3. General Answer(long/short)")

    choice = input("\nEnter your choice (1-3): ").strip()

    if choice == "1":
        return "mcq"

    elif choice == "2":
        return "application"

    elif choice == "3":
        print("\nSelect General Answer Type:")
        print("1. Long Answer")
        print("2. Short Answer")

        answer_choice = input(
            "\nEnter your choice (1-2): "
        ).strip()

        if answer_choice == "1":
            return "long"

        elif answer_choice == "2":
            return "short"

        else:
            raise ValueError(
                "Invalid choice. Please select 1 or 2."
            )

    else:
        raise ValueError(
            "Invalid choice. Please select 1, 2, or 3."
        )


def run_study_flow(file_path: str) -> None:
    document_id = process_pdf(file_path)

    question_type = select_question_type()

    questions = run_quiz(
        document_id=document_id,
        question_type=question_type
    )

    if not questions:
        raise RuntimeError(
            "Gemini returned no questions."
        )

    run_evaluation(
        questions,
        document_id
    )


def main() -> None:
    print("=" * 70)
    print("                 STUDY ENGINE - POC")
    print("=" * 70)

    init_db()

    file_path = prompt_for_document_path()

    validated_path = validate_document_path(
        file_path
    )

    run_study_flow(validated_path)


if __name__ == "__main__":
    main()