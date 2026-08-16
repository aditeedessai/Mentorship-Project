try:
    from backend.services.document_service import process_pdf, process_multiple_files, create_study_set_from_files
    from backend.services.quiz_service import run_quiz
    from backend.services.evaluation_service import run_evaluation
except ModuleNotFoundError:
    from services.document_service import process_pdf, process_multiple_files, create_study_set_from_files
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
    print("4. Exit/Finish")

    choice = input("\nEnter your choice (1-4): ").strip()

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
        return "exit"

    else:
        raise ValueError(
            "Invalid choice. Please select 1, 2, 3, or 4."
        )


def run_study_flow(file_paths: list[str] | str) -> None:
    if isinstance(file_paths, str):
        file_paths = [file_paths]

    study_set_id, document_ids = create_study_set_from_files(file_paths)
    doc_id = document_ids[0] if (document_ids and len(document_ids) == 1) else None

    completed_types = set()

    while True:
        if len(completed_types) == 4:
            print("\nAll question types have been completed.")
            break

        try:
            question_type = select_question_type()
        except ValueError as e:
            print(f"\n{e}")
            continue

        if question_type == "exit":
            break

        if question_type in completed_types:
            print("\nThis question type has already been completed.")
            continue

        try:
            questions = run_quiz(
                study_set_id=study_set_id,
                question_type=question_type
            )

            if not questions:
                print("\nGemini returned no questions.")
                continue

            run_evaluation(
                questions=questions,
                study_set_id=study_set_id,
                document_id=doc_id
            )

            completed_types.add(question_type)
        except Exception as e:
            print(f"\nAn error occurred during quiz execution or evaluation: {e}")
            continue

