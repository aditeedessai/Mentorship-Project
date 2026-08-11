import uuid

from backend.answer_evaluation.evaluator import (
    evaluate_answer,
    evaluate_mcq
)

from backend.database.attempt_repository import (
    save_attempt,
    get_attempt
)

from backend.database.evaluation_repository import (
    save_evaluation
)


def run_evaluation(
    questions,
    document_id: str
):
    """
    Run the complete quiz evaluation workflow.

    Workflow:
    1. Display questions
    2. Collect student answers
    3. Evaluate answers
    4. Save individual evaluations
    5. Calculate final score
    6. Save quiz attempt
    7. Verify saved attempt
    """

    print("\n[4/4] Answer evaluation")
    print("=" * 70)

    # ---------------------------------------------------------
    # Create attempt
    # ---------------------------------------------------------

    attempt_id = str(uuid.uuid4())

    print(
        f"Attempt ID: {attempt_id}"
    )

    results = []

    # ---------------------------------------------------------
    # Process each question
    # ---------------------------------------------------------

    for index, question in enumerate(
        questions,
        start=1
    ):

        print(
            f"\nQuestion {index} "
            f"[{question['question_type']}]"
        )

        print(
            question["question"]
        )

        # -----------------------------------------------------
        # Display MCQ options
        # -----------------------------------------------------

        if question.get("options"):

            for key, value in question["options"].items():

                print(
                    f"  {key}. {value}"
                )

        # -----------------------------------------------------
        # Get student answer
        # -----------------------------------------------------

        student_answer = input(
            "\nYour answer: "
        ).strip()

        # -----------------------------------------------------
        # Evaluate answer
        # -----------------------------------------------------

        if question["question_type"] == "mcq":

            result = evaluate_mcq(
                student_choice=student_answer,
                correct_choice=question.get(
                    "correct_option",
                    ""
                ),
                max_marks=2.0
            )

        else:

            result = evaluate_answer(
                student_answer=student_answer,
                reference_answer=question[
                    "reference_answer"
                ],
                max_marks=10.0
            )

        results.append(result)

        # -----------------------------------------------------
        # Save individual evaluation
        # -----------------------------------------------------

        save_evaluation(
            question_id=question["question_id"],
            student_answer=student_answer,
            evaluation=result,
            attempt_id=attempt_id
        )

        # -----------------------------------------------------
        # Display evaluation
        # -----------------------------------------------------

        print("\n--- Evaluation ---")

        print(
            f"Semantic score : "
            f"{result['semantic_score']}"
        )

        print(
            f"Concept score  : "
            f"{result['concept_score']}"
        )

        print(
            f"Final score    : "
            f"{result['final_score']}"
        )

        print(
            f"Marks awarded  : "
            f"{result['marks_awarded']}"
        )

        print(
            f"Keyword stuffing: "
            f"{result['keyword_stuffing_detected']}"
        )

        print(
            f"Logic inversion : "
            f"{result['logic_inversion_detected']}"
        )

    # ---------------------------------------------------------
    # Calculate final result
    # ---------------------------------------------------------

    total_marks = sum(
        2.0
        if question["question_type"] == "mcq"
        else 10.0
        for question in questions
    )

    earned_marks = sum(
        result["marks_awarded"]
        for result in results
    )

    percentage = (
        earned_marks / total_marks * 100
        if total_marks
        else 0
    )

    # ---------------------------------------------------------
    # Display final result
    # ---------------------------------------------------------

    print("\n" + "=" * 70)

    print("FINAL RESULT")

    print("=" * 70)

    print(
        f"Marks      : "
        f"{earned_marks:.2f} / "
        f"{total_marks:.2f}"
    )

    print(
        f"Percentage : "
        f"{percentage:.2f}%"
    )

    # ---------------------------------------------------------
    # Save complete attempt
    # ---------------------------------------------------------

    save_attempt(
        attempt_id=attempt_id,
        document_id=document_id,
        total_marks=total_marks,
        marks_awarded=earned_marks
    )

    # ---------------------------------------------------------
    # Verify database save
    # ---------------------------------------------------------

    saved_attempt = get_attempt(
        attempt_id
    )

    if saved_attempt is None:

        raise RuntimeError(
            "Quiz attempt could not be "
            "verified in the database."
        )

    print(
        f"Attempt saved to database: "
        f"{attempt_id}"
    )

    print(
        f"Database marks: "
        f"{saved_attempt['marks_awarded']:.2f} / "
        f"{saved_attempt['total_marks']:.2f}"
    )

    print(
        "Database verification: SUCCESS"
    )

    print("=" * 70)

    return {
        "attempt_id": attempt_id,
        "total_marks": total_marks,
        "earned_marks": earned_marks,
        "percentage": percentage,
        "results": results
    }