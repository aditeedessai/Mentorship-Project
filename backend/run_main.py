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
    from backend.services.document_service import process_multiple_files
    from backend.services.quiz_service import run_quiz
    from backend.services.evaluation_service import run_evaluation
except ModuleNotFoundError:
    from database.database import init_db
    from services.document_service import process_multiple_files
    from services.quiz_service import run_quiz
    from services.evaluation_service import run_evaluation


def prompt_for_document_paths() -> list[str]:
    """
    Ask the user to enter multiple study-material file paths.

    Multiple paths should be separated by commas.
    """

    print("\nEnter paths to study materials.")
    print("Separate multiple file paths with commas.")

    input_paths = input(
        "\nEnter file paths: "
    ).strip()

    if not input_paths:
        raise ValueError(
            "At least one document path is required."
        )

    file_paths = [
        path.strip().strip('"')
        for path in input_paths.split(",")
        if path.strip()
    ]

    return file_paths


def validate_document_paths(
    file_paths: list[str]
) -> list[str]:
    """
    Validate the list of uploaded document paths.
    """

    if not file_paths:
        raise ValueError(
            "At least one document path is required."
        )

    return file_paths


def select_question_type() -> str:
    """
    Ask the user to select the question type.
    """

    print("\nSelect Question Type:")
    print("1. MCQ")
    print("2. Application")
    print("3. General Answer (Long/Short)")

    choice = input(
        "\nEnter your choice (1-3): "
    ).strip()

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


def run_study_flow(
    file_paths: list[str]
) -> None:
    """
    Process multiple study materials and generate
    a quiz using the selected question type.
    """

    # ---------------------------------------------------------
    # Process all uploaded documents
    # ---------------------------------------------------------

    document_ids = process_multiple_files(
        file_paths
    )

    if not document_ids:
        raise RuntimeError(
            "No documents were processed successfully."
        )

    # ---------------------------------------------------------
    # Select question type
    # ---------------------------------------------------------

    question_type = select_question_type()

    # ---------------------------------------------------------
    # Generate quiz using all uploaded documents
    # ---------------------------------------------------------

    questions = run_quiz(
        document_ids=document_ids,
        question_type=question_type
    )

    if not questions:
        raise RuntimeError(
            "Gemini returned no questions."
        )

    # ---------------------------------------------------------
    # Run evaluation
    # ---------------------------------------------------------

    # The current evaluation system expects one document ID.
    # For now, use the first uploaded document.
    run_evaluation(
        questions,
        document_ids[0]
    )


def main() -> None:
    print("=" * 70)
    print("                 STUDY ENGINE - POC")
    print("=" * 70)

    # ---------------------------------------------------------
    # Initialize database
    # ---------------------------------------------------------

    init_db()

    # ---------------------------------------------------------
    # Get multiple document paths
    # ---------------------------------------------------------

    file_paths = prompt_for_document_paths()

    # ---------------------------------------------------------
    # Validate document paths
    # ---------------------------------------------------------

    validated_paths = validate_document_paths(
        file_paths
    )

    # ---------------------------------------------------------
    # Run complete study flow
    # ---------------------------------------------------------

    run_study_flow(
        validated_paths
    )


if __name__ == "__main__":
    main()