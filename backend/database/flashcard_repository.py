from backend.database.database import get_connection


def _row_to_card(row: dict) -> dict:
    """
    Maps the flashcards table's front/back columns to the term/definition
    shape used everywhere above the repository (Gemini's output shape,
    FlashcardItem schema, and StudySetFlashcardsCard.jsx's currentCard.term
    / currentCard.definition).
    """
    return {
        "id": row["id"],
        "study_set_id": row["study_set_id"],
        "term": row["front"],
        "definition": row["back"],
        "card_order": row["card_order"],
        "created_at": row["created_at"],
    }


def save_flashcards(study_set_id: str, user_id: str, cards: list) -> list[dict]:
    """
    Replaces all flashcards for a study set: deletes existing rows for
    study_set_id, then inserts the fresh set - same delete-then-insert
    pattern used elsewhere in this project (see quiz_repository.py's
    question_sources handling).
    """
    connection = get_connection()
    try:
        connection.execute(
            "DELETE FROM flashcards WHERE study_set_id = ?",
            (study_set_id,)
        )

        saved_rows = []
        for order, card in enumerate(cards or []):
            row = connection.execute(
                """
                INSERT INTO flashcards (study_set_id, user_id, front, back, card_order)
                VALUES (?, ?, ?, ?, ?)
                RETURNING id, study_set_id, front, back, card_order, created_at
                """,
                (
                    study_set_id,
                    user_id,
                    card.get("term", ""),
                    card.get("definition", ""),
                    order,
                )
            ).fetchone()
            saved_rows.append(dict(row))

        connection.commit()
        return [_row_to_card(row) for row in saved_rows]
    finally:
        connection.close()


def get_flashcards(study_set_id: str, user_id: str) -> list[dict]:
    """
    Ownership is enforced here (not left to RLS) since the backend
    connects with elevated (service-role) access and bypasses RLS -
    same reasoning as study_set_repository.list_study_sets().
    """
    connection = get_connection()
    try:
        rows = connection.execute(
            """
            SELECT id, study_set_id, front, back, card_order, created_at
            FROM flashcards
            WHERE study_set_id = ? AND user_id = ?
            ORDER BY card_order
            """,
            (study_set_id, user_id)
        ).fetchall()
        return [_row_to_card(dict(row)) for row in rows]
    finally:
        connection.close()
