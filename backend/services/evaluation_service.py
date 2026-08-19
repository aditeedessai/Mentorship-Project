import uuid
from collections import defaultdict

from backend.answer_evaluation.evaluator import (
    evaluate_answer,
    evaluate_mcq
)

from backend.answer_evaluation.performance_scorer import (
    TestAttempt,
    build_scored_entries
)

from backend.database.attempt_repository import (
    save_attempt,
    get_attempt,
    ensure_attempt_exists
)

from backend.database.evaluation_repository import (
    save_evaluation,
    get_evaluations_with_question_details
)

from backend.database.quiz_repository import (
    save_questions
)

from backend.answer_evaluation.grading import grade_for_percentage


SECTION_TITLE_MAP = {
    "mcq": "MCQ",
    "application": "Application",
    "long": "Long Answer",
    "short": "Short Answer"
}


def print_performance_summary(performance: dict, topic_performance: dict):
    """
    Format and display section-level performance, cumulative performance, and topic performance.
    """
    print("\n" + "=" * 70)
    print("CURRENT PERFORMANCE BREAKDOWN")
    print("=" * 70)

    sections = performance.get("sections", {})
    attempted = performance.get("attempted_sections", [])

    print("\nSECTION PERFORMANCE (Completed Sections):")
    print("-" * 70)
    if not attempted:
        print("  No sections completed yet.")
    else:
        for sec_key in attempted:
            sec_data = sections.get(sec_key, {})
            title = SECTION_TITLE_MAP.get(sec_key, sec_key.capitalize())
            awarded = sec_data.get("marks_awarded", 0.0)
            max_m = sec_data.get("max_marks", 0.0)
            pct = sec_data.get("percentage", 0.0)
            rmk = sec_data.get("remark", "N/A")

            print(f"\n{title}:")
            print(f"  Marks      : {awarded:.2f} / {max_m:.2f}")
            print(f"  Percentage : {pct:.2f}%")
            print(f"  Remark     : {rmk}")

    print("\nCUMULATIVE PERFORMANCE:")
    print("-" * 70)
    total_earned = performance.get("earned_marks", 0.0)
    total_max = performance.get("total_marks", 0.0)
    overall_pct = performance.get("overall_percentage", 0.0)
    overall_rmk = performance.get("overall_remark", "N/A")
    strongest = performance.get("strongest_section")
    weakest = performance.get("weakest_section")
    consistency = performance.get("consistency")

    print(f"  Marks      : {total_earned:.2f} / {total_max:.2f}")
    print(f"  Percentage : {overall_pct:.2f}%")
    print(f"  Remark     : {overall_rmk}")

    if strongest:
        print(f"  Strongest Section: {SECTION_TITLE_MAP.get(strongest, strongest)}")
    if weakest:
        print(f"  Weakest Section  : {SECTION_TITLE_MAP.get(weakest, weakest)}")
    if consistency:
        print(f"  Consistency      : {consistency.get('label')} (stdev: {consistency.get('stdev')})")

    print("\nTOPIC PERFORMANCE:")
    print("-" * 70)
    topics = topic_performance.get("topics", {})
    if not topics:
        print("  No topic data available.")
    else:
        for topic_name, t_data in topics.items():
            t_awarded = t_data.get("marks_awarded", 0.0)
            t_max = t_data.get("max_marks", 0.0)
            t_pct = t_data.get("percentage", 0.0)
            t_rmk = t_data.get("remark", "N/A")

            print(f"\n{topic_name}:")
            print(f"  Marks      : {t_awarded:.2f} / {t_max:.2f}")
            print(f"  Percentage : {t_pct:.2f}%")
            print(f"  Remark     : {t_rmk}")

    print("=" * 70 + "\n")


def run_evaluation(
    questions: list = None,
    study_set_id: str = None,
    document_id: str = None,
    attempt_id: str = None,
    display_performance: bool = False,
    status: str = "in_progress"
):
    """
    Run or update the quiz evaluation workflow for an attempt.

    - When questions are provided: evaluates student answers and records them under attempt_id.
    - Performance summary is displayed ONLY if display_performance=True or when viewing performance.
    - `status` is forwarded to save_attempt() ('in_progress' by default). Callers
      should pass status="completed" once the student has finished every section -
      see study_service.run_study_flow, which does this the moment all 4
      question types are done.
    """

    if not attempt_id:
        attempt_id = str(uuid.uuid4())

    # Guarantees a quiz_attempts row exists before any evaluations are
    # saved below - evaluations.attempt_id is a real foreign key in
    # Postgres, and save_attempt() (with real totals) only runs once,
    # at the end of this function. Safe to call every time: it's a
    # no-op if the attempt already exists (see its docstring).
    ensure_attempt_exists(
        attempt_id=attempt_id,
        study_set_id=study_set_id,
        document_id=document_id
    )

    questions = questions or []
    if questions:
        print("\n[4/4] Answer evaluation")
        print("=" * 70)
        print(f"Attempt ID: {attempt_id}")

        save_questions(
            study_set_id=study_set_id,
            questions=questions,
            document_id=document_id
        )

    results = []

    # ---------------------------------------------------------
    # Process each new question in this batch
    # ---------------------------------------------------------

    for index, question in enumerate(
        questions,
        start=1
    ):
        q_id = question.get("question_id", "N/A")
        raw_type = str(question.get("question_type", "short")).lower().strip()
        q_type = raw_type if raw_type in ["mcq", "application", "long", "short"] else "short"

        topic = str(question.get("topic", "general")).strip() or "general"

        raw_max = question.get("max_marks", question.get("marks"))
        if raw_max is not None:
            try:
                max_marks = float(raw_max)
            except (ValueError, TypeError):
                max_marks = 2.0 if q_type == "mcq" else 10.0
        else:
            max_marks = 2.0 if q_type == "mcq" else 10.0

        print(
            f"\nQuestion {index} (ID: {q_id}) "
            f"[{q_type}] (Topic: {topic})"
        )

        print(
            question.get("question", "")
        )

        # -----------------------------------------------------
        # Display MCQ options
        # -----------------------------------------------------

        if question.get("options") and isinstance(question["options"], dict):
            for key, value in question["options"].items():
                print(
                    f"  {key}. {value}"
                )

        # -----------------------------------------------------
        # Get student answer (support programmatic or interactive)
        # -----------------------------------------------------

        if "student_answer" in question and question["student_answer"] is not None:
            student_answer = str(question["student_answer"]).strip()
            print(f"\nYour answer: {student_answer}")
        else:
            student_answer = input(
                "\nYour answer: "
            ).strip()

        # -----------------------------------------------------
        # Evaluate answer
        # -----------------------------------------------------

        if q_type == "mcq":
            result = evaluate_mcq(
                student_choice=student_answer,
                correct_choice=question.get(
                    "correct_option",
                    ""
                ),
                max_marks=max_marks
            )
        else:
            result = evaluate_answer(
                student_answer=student_answer,
                reference_answer=question.get(
                    "reference_answer",
                    ""
                ),
                max_marks=max_marks
            )

        results.append(result)

        # -----------------------------------------------------
        # Save individual evaluation
        # -----------------------------------------------------

        save_evaluation(
            question_id=q_id,
            student_answer=student_answer,
            evaluation=result,
            attempt_id=attempt_id
        )

        # -----------------------------------------------------
        # Display question evaluation
        # -----------------------------------------------------

        print("\n--- Evaluation ---")

        print(
            f"Semantic score : "
            f"{result.get('semantic_score')}"
        )

        print(
            f"Concept score  : "
            f"{result.get('concept_score')}"
        )

        print(
            f"Final score    : "
            f"{result.get('final_score')}"
        )

        print(
            f"Marks awarded  : "
            f"{result.get('marks_awarded')}"
        )

        print(
            f"Keyword stuffing: "
            f"{result.get('keyword_stuffing_detected')}"
        )

        print(
            f"Logic inversion : "
            f"{result.get('logic_inversion_detected')}"
        )

    # ---------------------------------------------------------
    # Reconstruct cumulative TestAttempt from DB for attempt_id
    # ---------------------------------------------------------

    eval_records = get_evaluations_with_question_details(attempt_id)

    section_items = defaultdict(list)
    section_results = defaultdict(list)
    in_memory_q_map = {q.get("question_id"): q for q in questions if q.get("question_id")}

    for rec in eval_records:
        q_id = rec["question_id"]
        q_mem = in_memory_q_map.get(q_id, {})

        q_type = str(q_mem.get("question_type") or rec.get("question_type") or "short").lower().strip()
        if q_type not in ["mcq", "application", "long", "short"]:
            q_type = "short"

        topic = str(q_mem.get("topic") or rec.get("topic") or "general").strip() or "general"

        raw_max = q_mem.get("max_marks", q_mem.get("marks", rec.get("max_marks")))
        if raw_max is not None:
            try:
                max_marks = float(raw_max)
            except (ValueError, TypeError):
                max_marks = 2.0 if q_type == "mcq" else 10.0
        else:
            max_marks = 2.0 if q_type == "mcq" else 10.0

        marks_awarded = float(rec["marks_awarded"])

        section_items[q_type].append({
            "max_marks": max_marks,
            "topic": topic
        })
        section_results[q_type].append({
            "marks_awarded": marks_awarded
        })

    attempt = TestAttempt(
        attempt_id=attempt_id,
        known_sections=["mcq", "application", "long", "short"]
    )

    for section_name, items in section_items.items():
        res_list = section_results[section_name]
        entries = build_scored_entries(
            items,
            res_list,
            max_marks_field="max_marks",
            topic_field="topic"
        )
        attempt.submit_section(section_name, entries)

    performance = attempt.overall_performance()
    topic_performance = attempt.topic_breakdown()

    total_marks = sum(
        sum(item["max_marks"] for item in items)
        for items in section_items.values()
    )

    earned_marks = sum(
        sum(res["marks_awarded"] for res in res_list)
        for res_list in section_results.values()
    )

    overall_percentage = (
        round((earned_marks / total_marks * 100.0), 2)
        if total_marks > 0
        else 0.0
    )
    overall_remark = grade_for_percentage(overall_percentage).remark if total_marks > 0 else None

    # Attach exact marks-based cumulative metrics to performance
    performance["earned_marks"] = round(earned_marks, 2)
    performance["total_marks"] = round(total_marks, 2)
    performance["overall_percentage"] = overall_percentage
    performance["overall_remark"] = overall_remark

    for sec_name, sec_dict in performance.get("sections", {}).items():
        sec_dict["section_name"] = sec_name

    topic_performance["overall_percentage"] = overall_percentage
    topic_performance["overall_remark"] = overall_remark

    # Save/update attempt summary in database
    save_attempt(
        attempt_id=attempt_id,
        study_set_id=study_set_id,
        document_id=document_id,
        total_marks=total_marks,
        marks_awarded=earned_marks,
        status=status
    )

    # Display performance summary if requested or if viewing performance
    if display_performance or not questions:
        print_performance_summary(performance, topic_performance)

    return {
        "attempt_id": attempt_id,
        "total_marks": total_marks,
        "earned_marks": earned_marks,
        "percentage": overall_percentage,
        "results": results,
        "performance": performance,
        "topic_performance": topic_performance
    }


def get_current_performance(attempt_id: str):
    """
    Retrieve and display current cumulative performance snapshot for an attempt.
    """
    return run_evaluation(questions=[], attempt_id=attempt_id, display_performance=True)