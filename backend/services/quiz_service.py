from backend.quiz_generation.quiz_generator import generate_quiz


def run_quiz(document_id: str, question_type: str):
    """
    Generate a quiz from the uploaded study material
    based on the selected question type.
    """

    print(
        f"\n[3/4] Generating {question_type} quiz with Gemini..."
    )

    quiz = generate_quiz(
        document_id=document_id,
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