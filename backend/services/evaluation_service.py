import uuid
from collections import defaultdict

from backend.answer_evaluation.evaluator import (
    evaluate_answer,
    evaluate_answers_batch,
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
    get_evaluations_with_question_details,
    get_evaluated_question_types_by_study_set,
    get_results_summary_by_study_set
)

from backend.database.quiz_repository import (
    save_questions,
    get_question_by_id
)

from backend.database import study_set_repository

from backend.answer_evaluation.grading import grade_for_percentage

from backend.services import revision_service


SECTION_TITLE_MAP = {
    "mcq": "MCQ",
    "application": "Application",
    "long": "Long Answer",
    "short": "Short Answer"
}


def get_study_set_results_summary(study_set_id: str) -> dict:
    """
    Cumulative, cross-attempt results for a study set's "View Results"
    entry point (StudySetHeroHeaderCard) - unlike
    get_attempt_performance_summary(), which is scoped to one attempt_id,
    this has no single attempt to key off, since every question type is
    independently attempted up to 4 separate times now (see
    revision_service.py's pivot). Rolls every evaluation ever recorded
    for each question_type in this study set into one row each, so a
    type attempted 3 times shows the total across all 3, not just the
    latest.

    Returns {"study_set_id": str, "sections": [{"question_type",
    "section_title", "total_attempted", "total_correct",
    "accuracy_percentage", "attempts_taken", "last_attempt_at", "remark"},
    ...]} - one entry per question_type that has at least one recorded
    evaluation. A type never attempted simply has no entry (nothing to
    summarize), same "row presence = attempted" convention
    revision_repository.get_schedule() already uses.
    """
    rows = get_results_summary_by_study_set(study_set_id)

    sections = []
    for row in rows:
        q_type = row["question_type"]
        total_attempted = int(row["total_attempted"] or 0)
        total_correct = int(row["total_correct"] or 0)
        accuracy = round((total_correct / total_attempted) * 100, 2) if total_attempted > 0 else 0.0

        sections.append({
            "question_type": q_type,
            "section_title": SECTION_TITLE_MAP.get(q_type, q_type.capitalize()),
            "total_attempted": total_attempted,
            "total_correct": total_correct,
            "accuracy_percentage": accuracy,
            "attempts_taken": int(row["attempts_taken"] or 0),
            "last_attempt_at": row["last_attempt_at"],
            "remark": grade_for_percentage(accuracy).remark,
        })

    return {"study_set_id": study_set_id, "sections": sections}


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


from backend.config.word_limits import validate_answer_word_limit


def evaluate_and_save_attempt_answers(
    attempt_id: str,
    answers: list
) -> dict:
    """
    Evaluates student answers for a quiz attempt, saves each evaluation row to Supabase,
    recalculates cumulative attempt marks, updates quiz_attempts in Supabase, and returns
    evaluation summary.
    """
    attempt = get_attempt(attempt_id)
    if not attempt:
        raise ValueError(f"Attempt with ID '{attempt_id}' not found")
    if attempt.get("status") == "completed":
        raise ValueError("Cannot submit answers for a completed attempt")

    attempt_study_set_id = attempt.get("study_set_id")

    # Get section completion status to enforce section locking for already completed sections
    completion_info = get_attempt_section_completion_status(attempt_id)
    completed_sections = set(completion_info["completed_sections"])

    # Pre-validate all submitted answers BEFORE evaluating or saving any answer
    for item in answers:
        q_id = item["question_id"]
        student_ans = item["student_answer"]

        question = get_question_by_id(q_id)
        if not question:
            raise ValueError(f"Question with ID '{q_id}' not found")

        # 1. Question-to-study-set validation
        q_study_set_id = str(question.get("study_set_id") or "")
        if attempt_study_set_id and q_study_set_id != str(attempt_study_set_id):
            raise ValueError(
                f"Question with ID '{q_id}' does not belong to the study set associated with this attempt"
            )

        raw_type = str(question.get("question_type", "short")).lower().strip()
        q_type = raw_type if raw_type in ["mcq", "application", "long", "short"] else "short"

        # 2. Section locking validation
        if q_type in completed_sections:
            raise ValueError(
                f"Section '{q_type}' has already been submitted and is locked for this attempt."
            )

        # 3. Word limit validation
        is_valid, word_count, max_limit = validate_answer_word_limit(q_type, student_ans)
        if not is_valid:
            raise ValueError(
                f"Answer exceeds the maximum allowed word limit of {max_limit} words."
            )

        # 4. Question-type lock validation - every attempt is locked to
        # exactly ONE question_type from creation (quiz_attempts.
        # question_type is NOT NULL - see the 20260902150000 migration),
        # so every submitted answer must match it. This applies to every
        # attempt uniformly now, not just a "revision" subset - there is
        # no other kind left. Section locking above already prevents a
        # SECOND submission to an attempt's one section, but nothing
        # above stops a mismatched question_type from being submitted to
        # it in the first place.
        if q_type != attempt.get("question_type"):
            raise ValueError(
                f"Question type '{q_type}' does not match this attempt's "
                f"locked question type '{attempt.get('question_type')}'."
            )

    # -----------------------------------------------------------------
    # Evaluate. Skipped (empty) and MCQ answers are graded immediately
    # inline below - MCQ via evaluate_mcq(), which is fast, local, and
    # never touches the LLM judge, so there's no reason to batch it.
    # Every non-MCQ answer with real content is instead collected into
    # `batch_items` and evaluated together in ONE evaluate_answers_batch()
    # call after this loop, rather than one evaluate_answer() call per
    # item - this is what lets multiple items in the same section that
    # need LLM-judge escalation go out as a handful of grouped requests
    # (see llm_judge.judge_batch) instead of one individually-throttled
    # call per item.
    # -----------------------------------------------------------------
    eval_results = [None] * len(answers)
    item_meta = []  # parallel to `answers`: (q_id, student_ans, max_marks)
    pending_batch_indices = []
    batch_items = []

    for idx, item in enumerate(answers):
        q_id = item["question_id"]
        student_ans = item["student_answer"]

        question = get_question_by_id(q_id)
        if not question:
            raise ValueError(f"Question with ID '{q_id}' not found")

        raw_type = str(question.get("question_type", "short")).lower().strip()
        q_type = raw_type if raw_type in ["mcq", "application", "long", "short"] else "short"

        raw_max = question.get("marks")
        if raw_max is not None:
            try:
                max_marks = float(raw_max)
            except (ValueError, TypeError):
                max_marks = 2.0 if q_type == "mcq" else 10.0
        else:
            max_marks = 2.0 if q_type == "mcq" else 10.0

        item_meta.append((q_id, student_ans, max_marks))

        if student_ans.strip() == "":
            eval_results[idx] = {
                "final_score": 0.0,
                "marks_awarded": 0.0,
                "semantic_score": 0.0,
                "concept_score": 0.0,
                "is_correct": False,
                "matched_concepts": [],
                "missed_concepts": ["Question skipped by student"],
            }
        elif q_type == "mcq":
            eval_results[idx] = evaluate_mcq(
                student_choice=student_ans,
                correct_choice=question.get("correct_option", ""),
                max_marks=max_marks
            )
        else:
            pending_batch_indices.append(idx)
            batch_items.append({
                "student": student_ans,
                "reference": question.get("reference_answer", ""),
            })

    if batch_items:
        # evaluate_answers_batch() returns results in the same order as
        # batch_items, so pending_batch_indices (built in the same order
        # above) maps each result back to its original position in
        # `answers` by index.
        batch_results = evaluate_answers_batch(batch_items)
        for pos, idx in enumerate(pending_batch_indices):
            _, _, item_max_marks = item_meta[idx]
            result = dict(batch_results[pos])
            # evaluate_answers_batch() applies a single shared max_marks
            # (its default, 10.0) to every item in the call, since a
            # batch call has no per-item max_marks parameter. Every
            # non-MCQ question in this app is generated with marks=10.0
            # (see quiz_generator.py), so this never actually differs in
            # practice today - but recomputing marks_awarded against
            # THIS item's real max_marks (exactly like the old per-item
            # evaluate_answer(..., max_marks=max_marks) call did) keeps
            # this correct even if that ever changes, without needing a
            # separate batch call per distinct max_marks value.
            result["marks_awarded"] = round(result["final_score"] * item_max_marks, 2)
            eval_results[idx] = result

    for idx, item in enumerate(answers):
        q_id, student_ans, _ = item_meta[idx]
        save_evaluation(
            question_id=q_id,
            student_answer="" if student_ans.strip() == "" else student_ans,
            evaluation=eval_results[idx],
            attempt_id=attempt_id
        )

    eval_records = get_evaluations_with_question_details(attempt_id)

    total_marks = sum(float(rec.get("max_marks", 0.0)) for rec in eval_records)
    earned_marks = sum(float(rec.get("marks_awarded", 0.0)) for rec in eval_records)
    percentage = round((earned_marks / total_marks * 100.0), 2) if total_marks > 0 else 0.0

    save_attempt(
        attempt_id=attempt_id,
        question_type=attempt.get("question_type"),
        study_set_id=attempt.get("study_set_id"),
        document_id=attempt.get("document_id"),
        total_marks=total_marks,
        marks_awarded=earned_marks,
        status=attempt.get("status", "in_progress")
    )

    # Write-time revision_schedules update - runs unconditionally for
    # every attempt now (there's no other kind left). Every attempt has
    # exactly one section, so this single
    # evaluate_and_save_attempt_answers() call IS the completion of that
    # attempt's only section - no separate "is this attempt done yet"
    # check is needed. This is also what CREATES the schedule row the
    # first time this (study_set, question_type) pair is ever completed
    # (see revision_repository.record_attempt_result()) - there's no
    # separate "initial attempt finishes" event that pre-creates it
    # anymore.
    revision_service.record_attempt_result(attempt | {"attempt_id": attempt_id})

    eval_responses = []
    for rec in eval_records:
        is_corr = rec.get("is_correct")
        if is_corr is None:
            final_s = rec.get("final_score")
            is_corr = (final_s >= 0.55) if final_s is not None else None

        eval_responses.append({
            "question_id": rec["question_id"],
            "student_answer": rec.get("student_answer"),
            "marks_awarded": float(rec["marks_awarded"]),
            "final_score": float(rec["final_score"]),
            "is_correct": is_corr,
            "semantic_score": float(rec["semantic_score"]) if rec.get("semantic_score") is not None else None,
            "concept_score": float(rec["concept_score"]) if rec.get("concept_score") is not None else None,
            "matched_concepts": rec.get("matched_concepts"),
            "missed_concepts": rec.get("missed_concepts"),
            "keyword_stuffing_detected": False,
            "logic_inversion_detected": False,
        })

    return {
        "attempt_id": attempt_id,
        "total_marks": total_marks,
        "earned_marks": earned_marks,
        "percentage": percentage,
        "results": eval_responses
    }


# The 4 canonical question types. No longer "mandatory" in the old
# sense (an attempt no longer has to complete all 4 together - every
# attempt is independently scoped to exactly one type from creation) -
# this is now just the enumerated set of valid types, still needed for
# get_study_set_progress()'s cross-attempt aggregate below.
QUESTION_TYPES = ["mcq", "short", "application", "long"]


def get_attempt_section_completion_status(attempt_id: str) -> dict:
    """
    Derives section completion status for an attempt based on evaluations
    recorded. Every attempt is locked to exactly one question_type from
    creation, so "complete" always means just that one section - as soon
    as it has evaluations, the attempt is complete, full stop. There is
    no other kind of attempt to branch on anymore.

    Returns dict:
      {
        "completed_sections": ["mcq"],
        "remaining_sections": [],
        "is_attempt_complete": True
      }
    """
    attempt = get_attempt(attempt_id)
    if not attempt:
        raise ValueError(f"Attempt with ID '{attempt_id}' not found")

    sections_to_check = [attempt["question_type"]]

    eval_records = get_evaluations_with_question_details(attempt_id)

    completed_set = set()
    for rec in eval_records:
        raw_type = str(rec.get("question_type") or "short").lower().strip()
        q_type = raw_type if raw_type in QUESTION_TYPES else "short"
        completed_set.add(q_type)

    completed_sections = [s for s in sections_to_check if s in completed_set]
    remaining_sections = [s for s in sections_to_check if s not in completed_set]
    is_attempt_complete = len(remaining_sections) == 0

    return {
        "completed_sections": completed_sections,
        "remaining_sections": remaining_sections,
        "is_attempt_complete": is_attempt_complete,
    }


def get_study_set_progress(user_id: str) -> list[dict]:
    """
    Returns, for every study set owned by the user, how many of the 4
    question types (QUESTION_TYPES) have at least one recorded
    evaluation - applied across every attempt ever taken under a study
    set (not just whichever one is currently 'in_progress'), so the
    dashboard can show progress without creating or mutating any
    attempt. Purely a cross-attempt aggregate for the dashboard's
    StudySetProgressCard - unrelated to (and unaffected by) any single
    attempt's own completion status above.
    """
    study_sets = study_set_repository.list_study_sets(user_id=user_id)
    eval_rows = get_evaluated_question_types_by_study_set(user_id)

    completed_by_set = defaultdict(set)
    for row in eval_rows:
        raw_type = str(row.get("question_type") or "short").lower().strip()
        q_type = raw_type if raw_type in QUESTION_TYPES else "short"
        completed_by_set[row["study_set_id"]].add(q_type)

    return [
        {
            "study_set_id": study_set["study_set_id"],
            "name": study_set["name"],
            "sections_completed": len(completed_by_set.get(study_set["study_set_id"], set())),
            "total_sections": len(QUESTION_TYPES),
        }
        for study_set in study_sets
    ]


def get_attempt_performance_summary(attempt_id: str) -> dict:
    """
    Retrieves and calculates performance metrics (cumulative, section-wise, and topic-wise)
    from real Supabase evaluations and questions records for a given attempt.
    Includes overall section completion status (completed_sections, remaining_sections, is_attempt_complete).
    """
    attempt = get_attempt(attempt_id)
    if not attempt:
        raise ValueError(f"Attempt with ID '{attempt_id}' not found")

    completion_info = get_attempt_section_completion_status(attempt_id)
    eval_records = get_evaluations_with_question_details(attempt_id)

    if not eval_records:
        return {
            "attempt_id": attempt_id,
            "status": attempt.get("status", "in_progress"),
            "question_type": attempt.get("question_type"),
            "completed_sections": completion_info["completed_sections"],
            "remaining_sections": completion_info["remaining_sections"],
            "is_attempt_complete": completion_info["is_attempt_complete"],
            "cumulative": {
                "total_marks_obtained": 0.0,
                "total_maximum_marks": 0.0,
                "overall_percentage": 0.0,
                "overall_remark": grade_for_percentage(0.0).remark,
                "strongest_section": None,
                "weakest_section": None,
            },
            "sections": [],
            "topics": []
        }

    section_totals = defaultdict(lambda: {"marks_obtained": 0.0, "maximum_marks": 0.0})
    topic_totals = defaultdict(lambda: {"marks_obtained": 0.0, "maximum_marks": 0.0})

    for rec in eval_records:
        q_type = str(rec.get("question_type") or "short").lower().strip()
        if q_type not in ["mcq", "application", "long", "short"]:
            q_type = "short"

        topic = str(rec.get("topic") or "general").strip() or "general"

        marks_awarded = float(rec.get("marks_awarded", 0.0))
        max_marks = float(rec.get("max_marks", 2.0 if q_type == "mcq" else 10.0))

        section_totals[q_type]["marks_obtained"] += marks_awarded
        section_totals[q_type]["maximum_marks"] += max_marks

        topic_totals[topic]["marks_obtained"] += marks_awarded
        topic_totals[topic]["maximum_marks"] += max_marks

    sections = []
    sec_pcts = {}
    for sec_name, data in section_totals.items():
        obtained = round(data["marks_obtained"], 2)
        max_m = round(data["maximum_marks"], 2)
        pct = round((obtained / max_m * 100.0), 2) if max_m > 0 else 0.0
        remark = grade_for_percentage(pct).remark
        sec_pcts[sec_name] = pct
        sections.append({
            "section_name": sec_name,
            "marks_obtained": obtained,
            "maximum_marks": max_m,
            "percentage": pct,
            "remark": remark
        })

    topics = []
    for topic_name, data in topic_totals.items():
        obtained = round(data["marks_obtained"], 2)
        max_m = round(data["maximum_marks"], 2)
        pct = round((obtained / max_m * 100.0), 2) if max_m > 0 else 0.0
        remark = grade_for_percentage(pct).remark
        topics.append({
            "topic_name": topic_name,
            "marks_obtained": obtained,
            "maximum_marks": max_m,
            "percentage": pct,
            "remark": remark
        })

    total_obtained = round(sum(d["marks_obtained"] for d in section_totals.values()), 2)
    total_maximum = round(sum(d["maximum_marks"] for d in section_totals.values()), 2)
    overall_pct = round((total_obtained / total_maximum * 100.0), 2) if total_maximum > 0 else 0.0
    overall_remark = grade_for_percentage(overall_pct).remark

    strongest = max(sec_pcts, key=sec_pcts.get) if len(sec_pcts) >= 2 else None
    weakest = min(sec_pcts, key=sec_pcts.get) if len(sec_pcts) >= 2 else None

    cumulative = {
        "total_marks_obtained": total_obtained,
        "total_maximum_marks": total_maximum,
        "overall_percentage": overall_pct,
        "overall_remark": overall_remark,
        "strongest_section": strongest,
        "weakest_section": weakest,
    }

    return {
        "attempt_id": attempt_id,
        "status": attempt.get("status", "in_progress"),
        "question_type": attempt.get("question_type"),
        "completed_sections": completion_info["completed_sections"],
        "remaining_sections": completion_info["remaining_sections"],
        "is_attempt_complete": completion_info["is_attempt_complete"],
        "cumulative": cumulative,
        "sections": sections,
        "topics": topics,
    }