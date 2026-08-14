try:
    from backend.services.document_service import process_pdf, process_multiple_files
    from backend.services.quiz_service import run_quiz
    from backend.services.evaluation_service import run_evaluation
except ModuleNotFoundError:
    from services.document_service import process_pdf, process_multiple_files
    from services.quiz_service import run_quiz
    from services.evaluation_service import run_evaluation


def prompt_for_document_path() -> str:
    return input(
        "\nEnter path to document (PDF, DOCX, PPTX): "
    ).strip().strip('"')


def prompt_for_document_paths() -> list[str]:
    raw_input = input(
        "\nEnter path(s) to document(s) (comma-separated for multiple files): "
    ).strip()
    
    paths = [p.strip().strip('"') for p in raw_input.split(",") if p.strip()]
    return paths


def validate_document_path(file_path: str) -> str:
    if not file_path:
        raise ValueError("Document path cannot be empty.")

    return file_path


def validate_document_paths(file_paths: list[str] | str) -> list[str]:
    if isinstance(file_paths, str):
        file_paths = [file_paths]

    if not file_paths:
        raise ValueError("Document path cannot be empty.")

    for path in file_paths:
        validate_document_path(path)

    return file_paths


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


def run_study_flow(file_paths: list[str] | str) -> None:
    if isinstance(file_paths, str):
        file_paths = [file_paths]

    if len(file_paths) == 1:
        document_ids = [process_pdf(file_paths[0])]
    else:
        document_ids = process_multiple_files(file_paths)

    question_type = select_question_type()

    questions = run_quiz(
        document_ids=document_ids,
        question_type=question_type
    )

    if not questions:
        raise RuntimeError(
            "Gemini returned no questions."
        )

    run_evaluation(
        questions,
        document_ids[0]
    )
