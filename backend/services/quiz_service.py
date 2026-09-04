from backend.quiz_generation.quiz_generator import generate_quiz


def display_generated_questions(questions: list[dict]) -> None:
    """
    Display all generated questions with question metadata before student answer collection.
    Note: Source document IDs and chunk IDs are retained internally on question objects
    for traceability, but excluded from student display.
    """
    print("\n" + "=" * 60, flush=True)
    print("GENERATED QUESTIONS", flush=True)
    print("===================", flush=True)

    for index, q in enumerate(questions, start=1):
        q_id = q.get("question_id", "N/A")
        q_type = q.get("question_type", "N/A")
        topic = q.get("topic", "N/A")
        q_text = q.get("question", "")
        ref_ans = q.get("reference_answer", "N/A")

        print(f"\nQuestion {index}", flush=True)
        print(f"Question ID : {q_id}", flush=True)
        print(f"Type        : {q_type}", flush=True)
        print(f"Topic       : {topic}", flush=True)
        print(f"\nQuestion: {q_text}", flush=True)

        options = q.get("options")
        if options and isinstance(options, dict):
            print("\nOptions:", flush=True)
            for opt_key, opt_val in options.items():
                print(f"{opt_key}. {opt_val}", flush=True)

        correct_opt = q.get("correct_option")
        if correct_opt:
            print(f"\nCorrect Option: {correct_opt}", flush=True)

        print(f"\nReference Answer: {ref_ans}", flush=True)
        print("\n---", flush=True)


def run_quiz(
    study_set_id: str = None,
    question_type: str = "mcq",
    document_ids: list[str] | str = None,
    attempt_id: str = None
):
    """
    Generate a quiz from uploaded study material(s)
    based on the selected question type.

    `attempt_id` (optional): forwarded to generate_quiz() so the newly
    generated batch is tagged as belonging to this specific attempt -
    see quiz_repository.save_questions()'s docstring for why.
    """

    if not study_set_id and not document_ids:
        raise ValueError(
            "Neither study_set_id nor document_ids were provided for quiz generation."
        )

    print(
        f"\n[3/4] Generating {question_type} quiz with Gemini..."
    )

    if study_set_id:
        print(f"      Using Study Set: {study_set_id}")
    elif document_ids:
        num_docs = len(document_ids) if isinstance(document_ids, list) else 1
        print(f"      Using {num_docs} uploaded document(s).")

    quiz = generate_quiz(
        study_set_id=study_set_id,
        question_type=question_type,
        document_ids=document_ids,
        attempt_id=attempt_id
    )

    questions = quiz.get(
        "questions",
        []
    )

    print(
        f"      Generated {len(questions)} questions."
    )

    display_generated_questions(questions)

    return questions