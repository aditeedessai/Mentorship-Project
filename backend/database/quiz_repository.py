import json

from backend.database.database import get_connection


def save_questions(study_set_id: str = None, questions: list = None, document_id: str = None):
    """
    Save generated quiz questions and their reference answers
    for a specific study set or document.
    """
    if questions is None:
        questions = []

    connection = get_connection()

    try:
        for question in questions:
            options = question.get("options")

            if options is not None and not isinstance(options, str):
                options = json.dumps(options)

            doc_id = document_id or question.get("document_id") or ""
            set_id = study_set_id or question.get("study_set_id") or ""

            connection.execute(
                """
                INSERT INTO questions (
                    question_id,
                    document_id,
                    study_set_id,
                    question_type,
                    topic,
                    question,
                    reference_answer,
                    options,
                    correct_option
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    question["question_id"],
                    doc_id,
                    set_id,
                    question["question_type"],
                    question.get("topic"),
                    question["question"],
                    question["reference_answer"],
                    options,
                    question.get("correct_option")
                )
            )

        connection.commit()

    finally:
        connection.close()


def get_questions_by_study_set(study_set_id: str):
    """
    Retrieve questions for a specific study set.
    """
    connection = get_connection()

    try:
        rows = connection.execute(
            """
            SELECT
                question_id,
                study_set_id,
                document_id,
                question_type,
                topic,
                question,
                options
            FROM questions
            WHERE study_set_id = ?
            ORDER BY id
            """,
            (study_set_id,)
        ).fetchall()

        questions = []

        for row in rows:
            question = dict(row)

            if question["options"]:
                question["options"] = json.loads(
                    question["options"]
                )

            questions.append(question)

        return questions

    finally:
        connection.close()


def get_questions_by_document(document_id: str):
    """
    Retrieve questions for a specific uploaded document.
    """
    connection = get_connection()

    try:
        rows = connection.execute(
            """
            SELECT
                question_id,
                study_set_id,
                document_id,
                question_type,
                topic,
                question,
                options
            FROM questions
            WHERE document_id = ?
            ORDER BY id
            """,
            (document_id,)
        ).fetchall()

        questions = []

        for row in rows:
            question = dict(row)

            if question["options"]:
                question["options"] = json.loads(
                    question["options"]
                )

            questions.append(question)

        return questions

    finally:
        connection.close()


def get_question_by_id(question_id: str):
    """
    Retrieve one question including its reference answer.
    """
    connection = get_connection()

    try:
        row = connection.execute(
            """
            SELECT
                question_id,
                study_set_id,
                document_id,
                question_type,
                topic,
                question,
                reference_answer,
                options,
                correct_option
            FROM questions
            WHERE question_id = ?
            LIMIT 1
            """,
            (question_id,)
        ).fetchone()

        if row is None:
            return None

        question = dict(row)

        if question["options"]:
            question["options"] = json.loads(
                question["options"]
            )

        return question

    finally:
        connection.close()