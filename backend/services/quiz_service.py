from backend.quiz_generation.quiz_generator import generate_quiz


def run_quiz(
    study_set_id: str = None,
    question_type: str = "mcq",
    document_ids: list[str] | str = None
):
    """
    Generate a quiz from uploaded study material(s)
    based on the selected question type.
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
        document_ids=document_ids
    )

    questions = quiz.get(
        "questions",
        []
    )

    print(
        f"      Generated {len(questions)} questions."
    )

    return questions