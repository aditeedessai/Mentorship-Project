import uuid
from pathlib import Path

from backend.services.document_service import (
    process_pdf,
    process_multiple_files,
    create_study_set_from_files
)
from backend.services.quiz_service import run_quiz
from backend.services.evaluation_service import run_evaluation
from backend.database import study_set_repository


def create_study_set(name: str, user_id: str | None = None) -> dict:
    study_set_id = str(uuid.uuid4())
    return study_set_repository.create_study_set(study_set_id, name, user_id=user_id)


def list_study_sets(user_id: str | None = None) -> list[dict]:
    return study_set_repository.list_study_sets(user_id=user_id)


def get_study_set(study_set_id: str, user_id: str | None = None) -> dict | None:
    return study_set_repository.get_study_set(study_set_id, user_id=user_id)


def delete_study_set(study_set_id: str, user_id: str | None = None) -> bool:
    return study_set_repository.delete_study_set(study_set_id, user_id=user_id)


def delete_all_study_sets(user_id: str) -> int:
    return study_set_repository.delete_all_study_sets(user_id)


# Only these file formats are allowed
SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".pptx"}


def prompt_for_document_path() -> str:
    return input(
        "\nEnter path to document (PDF, DOCX, PPTX): "
    ).strip().strip('"')


def prompt_for_document_paths() -> list[str]:
    while True:
        raw_input = input(
            "\nEnter path(s) to document(s) "
            "(comma-separated for multiple files): "
        ).strip()

        paths = [
            p.strip().strip('"')
            for p in raw_input.split(",")
            if p.strip()
        ]

        try:
            return validate_document_paths(paths)

        except (ValueError, FileNotFoundError) as e:
            print(f"\nError: {e}")
            print("Please enter only valid PDF, DOCX, or PPTX files.")
            print("Please try again.")


def validate_document_path(file_path: str) -> str:
    """
    Validate a single document path.

    Allowed formats:
    - PDF
    - DOCX
    - PPTX
    """

    if not file_path:
        raise ValueError(
            "Document path cannot be empty."
        )

    path = Path(file_path).expanduser()

    # Check file extension
    if path.suffix.lower() not in SUPPORTED_EXTENSIONS:
        raise ValueError(
            f"Unsupported file type '{path.suffix}'. "
            "Only PDF, DOCX, and PPTX files are allowed."
        )

    # Check whether the file exists
    if not path.exists():
        raise FileNotFoundError(
            f"File not found: {file_path}"
        )

    # Check that the path is actually a file
    if not path.is_file():
        raise ValueError(
            f"The provided path is not a file: {file_path}"
        )

    return str(path)


def validate_document_paths(
    file_paths: list[str] | str
) -> list[str]:
    """
    Validate one or multiple document paths.
    """

    if isinstance(file_paths, str):
        file_paths = [file_paths]

    if not file_paths:
        raise ValueError(
            "Document path cannot be empty."
        )

    validated_paths = []

    for path in file_paths:
        validated_paths.append(
            validate_document_path(path)
        )

    return validated_paths


def select_question_type() -> str:
    print("\nSelect Action / Question Type:")
    print("1. MCQ")
    print("2. Application")
    print("3. General Answer(long/short)")
    print("4. View Current Performance")
    print("5. Exit/Finish")

    choice = input(
        "\nEnter your choice (1-5): "
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

    elif choice == "4":
        return "view_performance"

    elif choice == "5":
        return "exit"

    else:
        raise ValueError(
            "Invalid choice. Please select 1, 2, 3, 4, or 5."
        )


def run_study_flow(
    file_paths: list[str] | str
) -> None:

    if isinstance(file_paths, str):
        file_paths = [file_paths]

    # Validate files again before processing.
    # This protects the flow even if this function
    # is called from somewhere other than the prompt.
    try:
        file_paths = validate_document_paths(file_paths)

    except (ValueError, FileNotFoundError) as e:
        print(f"\nError: {e}")
        print(
            "Only PDF, DOCX, and PPTX files are allowed."
        )
        return

    try:
        study_set_id, document_ids = (
            create_study_set_from_files(file_paths)
        )

    except Exception as e:
        print(
            f"\nAn error occurred while processing "
            f"the document(s): {e}"
        )
        return

    doc_id = (
        document_ids[0]
        if document_ids and len(document_ids) == 1
        else None
    )

    attempt_id = str(uuid.uuid4())
    print(f"\n[Assessment Session] Attempt ID: {attempt_id}")

    completed_types = set()

    while True:

        if len(completed_types) == 4:
            print(
                "\nAll question types have been completed."
            )
            print("\nDisplaying final cumulative performance:")
            run_evaluation(
                questions=[],
                study_set_id=study_set_id,
                document_id=doc_id,
                attempt_id=attempt_id,
                status="completed"
            )
            break

        try:
            question_type = select_question_type()

        except ValueError as e:
            print(f"\n{e}")
            continue

        if question_type == "exit":
            break

        if question_type == "view_performance":
            run_evaluation(
                questions=[],
                study_set_id=study_set_id,
                document_id=doc_id,
                attempt_id=attempt_id
            )
            continue

        if question_type in completed_types:
            print(
                "\nThis question type has already been completed."
            )
            continue

        try:
            questions = run_quiz(
                study_set_id=study_set_id,
                question_type=question_type
            )

            if not questions:
                print(
                    "\nGemini returned no questions."
                )
                continue

            run_evaluation(
                questions=questions,
                study_set_id=study_set_id,
                document_id=doc_id,
                attempt_id=attempt_id
            )

            completed_types.add(question_type)

        except Exception as e:
            print(
                "\nAn error occurred during quiz execution "
                f"or evaluation: {e}"
            )
            continue