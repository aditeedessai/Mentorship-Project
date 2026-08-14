from backend.quiz_generation.quiz_generator import generate_quiz


def run_quiz(
    document_ids: list[str],
    question_type: str
):
    """
    Generate a quiz from multiple uploaded study materials
    based on the selected question type.
    """

    if not document_ids:
        raise ValueError(
            "No documents were provided for quiz generation."
        )

    print(
        f"\n[3/4] Generating {question_type} quiz with Gemini..."
    )

    print(
        f"      Using {len(document_ids)} uploaded documents."
    )

    quiz = generate_quiz(
        document_ids=document_ids,
        question_type=question_type
    )

    questions = quiz.get(
        "questions",
        []
    )

    print(
        f"      Generated {len(questions)} questions."
    )

    return questions