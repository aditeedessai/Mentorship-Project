from backend.quiz_generation.quiz_generator import generate_quiz


def run_quiz(document_id: str):
    """
    Generate a quiz from the uploaded study material.

    The actual Gemini implementation remains inside
    quiz_generation/quiz_generator.py.
    """

    print(
        "\n[3/4] Generating quiz with Gemini..."
    )

    quiz = generate_quiz(
        document_id=document_id
    )

    questions = quiz.get(
        "questions",
        []
    )

    print(
        f"      Generated {len(questions)} questions."
    )

    return questions