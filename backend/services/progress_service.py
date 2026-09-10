import logging
import uuid
from typing import Dict, List, Any

from backend.database.database import get_connection
from backend.database import study_set_repository

logger = logging.getLogger(__name__)

CANONICAL_QUESTION_TYPES = ["mcq", "short", "application", "long"]


def get_study_set_attempt_history(user_id: str, study_set_id: str) -> Dict[str, Any] | None:
    """
    Retrieves chronological attempt progress for each supported question type
    ('mcq', 'short', 'application', 'long') for a specific study set owned by user_id.

    - Excludes 'in_progress' attempts (only includes status='completed').
    - Does NOT average across study sets (scopes strictly to study_set_id).
    - Excludes unattempted question types from available_question_types.
    - Capped at maximum 4 attempts per question type.
    """
    # 1. Validate study_set_id UUID format
    try:
        uuid.UUID(str(study_set_id))
    except (ValueError, TypeError):
        return None

    # 2. Ownership check
    study_set = study_set_repository.get_study_set(study_set_id, user_id=user_id)
    if not study_set:
        return None

    connection = get_connection()
    try:
        rows = connection.execute(
            """
            SELECT attempt_id, question_type, total_marks, marks_awarded, status, created_at
            FROM quiz_attempts
            WHERE study_set_id = ? AND user_id = ? AND status = 'completed'
            ORDER BY created_at ASC, updated_at ASC
            """,
            (study_set_id, user_id),
        ).fetchall()

        type_attempts: Dict[str, List[Dict[str, Any]]] = {q_type: [] for q_type in CANONICAL_QUESTION_TYPES}

        for row in rows:
            d = dict(row)
            q_type = str(d.get("question_type") or "").lower().strip()
            if q_type not in CANONICAL_QUESTION_TYPES:
                continue

            # Limit each question type to max 4 completed attempts
            if len(type_attempts[q_type]) >= 4:
                continue

            total_m = float(d.get("total_marks") or 0.0)
            awarded_m = float(d.get("marks_awarded") or 0.0)

            if total_m > 0:
                pct = round((awarded_m / total_m) * 100.0, 2)
                pct = min(100.0, max(0.0, pct))
            else:
                pct = 0.0

            type_attempts[q_type].append({
                "attempt_id": d.get("attempt_id"),
                "percentage": pct,
                "created_at": d.get("created_at"),
            })

        # Filter to question types that actually have at least 1 completed attempt
        available_question_types = [
            q_type for q_type in CANONICAL_QUESTION_TYPES if len(type_attempts[q_type]) > 0
        ]

        if not available_question_types:
            return {
                "study_set_id": study_set_id,
                "attempts": [],
                "available_question_types": [],
            }

        max_attempts_count = max(len(type_attempts[q_type]) for q_type in available_question_types)
        max_attempts_count = min(4, max_attempts_count)

        attempts_list = []
        for idx in range(max_attempts_count):
            attempt_num = idx + 1
            by_type = {}
            latest_time = None

            for q_type in available_question_types:
                attempts_for_type = type_attempts[q_type]
                if idx < len(attempts_for_type):
                    item = attempts_for_type[idx]
                    by_type[q_type] = item["percentage"]
                    if item.get("created_at"):
                        latest_time = item["created_at"]

            attempts_list.append({
                "attempt_number": attempt_num,
                "created_at": latest_time,
                "by_type": by_type,
            })

        return {
            "study_set_id": study_set_id,
            "attempts": attempts_list,
            "available_question_types": available_question_types,
        }

    finally:
        connection.close()
