import json

from backend.database.database import get_connection


def save_questions(study_set_id: str = None, questions: list = None, document_id: str = None):
    """
    Save generated quiz questions and their reference answers.

    Inserts rows into `questions` and populates the canonical `question_sources` table
    linking (question_id, document_id, chunk_id).
    """
    if questions is None:
        questions = []

    connection = get_connection()

    try:
        for question in questions:
            options = question.get("options")
            if options is not None and not isinstance(options, str):
                options = json.dumps(options)

            # Sources metadata
            source_doc_ids = question.get("source_document_ids", [])
            source_chk_ids = question.get("source_chunk_ids", [])

            if isinstance(source_doc_ids, str):
                source_doc_ids = [source_doc_ids]
            if isinstance(source_chk_ids, str):
                source_chk_ids = [source_chk_ids]

            # Primary doc ID for backwards compatibility
            primary_doc_id = document_id or question.get("document_id")
            if not primary_doc_id and source_doc_ids:
                primary_doc_id = source_doc_ids[0]

            doc_id = primary_doc_id or ""
            set_id = study_set_id or question.get("study_set_id") or ""
            marks = float(question.get("marks", 2.0 if question.get("question_type") == "mcq" else 10.0))

            # Insert or replace question
            connection.execute(
                """
                INSERT OR REPLACE INTO questions (
                    question_id,
                    document_id,
                    study_set_id,
                    question_type,
                    topic,
                    question,
                    reference_answer,
                    options,
                    correct_option,
                    source_document_ids,
                    source_chunk_ids,
                    marks
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    question.get("question_id"),
                    doc_id,
                    set_id,
                    question.get("question_type", "short"),
                    question.get("topic"),
                    question.get("question", ""),
                    question.get("reference_answer", ""),
                    options,
                    question.get("correct_option"),
                    json.dumps(source_doc_ids),
                    json.dumps(source_chk_ids),
                    marks
                )
            )

            # Populate question_sources canonical relationship table
            sources_tuples = question.get("sources_tuples", [])
            if sources_tuples:
                for doc, chk in sources_tuples:
                    connection.execute(
                        """
                        INSERT INTO question_sources (question_id, document_id, chunk_id)
                        VALUES (?, ?, ?)
                        """,
                        (question["question_id"], doc, chk)
                    )
            elif source_doc_ids or source_chk_ids:
                if source_chk_ids and source_doc_ids:
                    for d in source_doc_ids:
                        for c in source_chk_ids:
                            connection.execute(
                                """
                                INSERT INTO question_sources (question_id, document_id, chunk_id)
                                VALUES (?, ?, ?)
                                """,
                                (question["question_id"], d, c)
                            )
                else:
                    for d in (source_doc_ids or [doc_id]):
                        if d:
                            connection.execute(
                                """
                                INSERT INTO question_sources (question_id, document_id, chunk_id)
                                VALUES (?, ?, ?)
                                """,
                                (question["question_id"], d, None)
                            )
            elif doc_id:
                connection.execute(
                    """
                    INSERT INTO question_sources (question_id, document_id, chunk_id)
                    VALUES (?, ?, ?)
                    """,
                    (question["question_id"], doc_id, None)
                )

        connection.commit()

    finally:
        connection.close()


def get_question_sources(question_id: str) -> list[dict]:
    """
    Retrieve canonical question-to-source mappings for a question.
    """
    connection = get_connection()
    try:
        rows = connection.execute(
            """
            SELECT question_id, document_id, chunk_id
            FROM question_sources
            WHERE question_id = ?
            """,
            (question_id,)
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        connection.close()


def get_questions_by_study_set(study_set_id: str):
    """
    Retrieve questions for a specific study set with source metadata attached.
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
                options,
                source_document_ids,
                source_chunk_ids,
                marks
            FROM questions
            WHERE study_set_id = ?
            ORDER BY id
            """,
            (study_set_id,)
        ).fetchall()

        questions = []

        for row in rows:
            question = dict(row)

            if question.get("options"):
                question["options"] = json.loads(question["options"])
            if question.get("source_document_ids"):
                question["source_document_ids"] = json.loads(question["source_document_ids"])
            else:
                question["source_document_ids"] = []
            if question.get("source_chunk_ids"):
                question["source_chunk_ids"] = json.loads(question["source_chunk_ids"])
            else:
                question["source_chunk_ids"] = []

            # Attach canonical sources from question_sources table
            sources = connection.execute(
                "SELECT document_id, chunk_id FROM question_sources WHERE question_id = ?",
                (question["question_id"],)
            ).fetchall()
            question["sources"] = [dict(s) for s in sources]

            questions.append(question)

        return questions

    finally:
        connection.close()


def get_questions_by_document(document_id: str):
    """
    Retrieve questions for a specific uploaded document using canonical question_sources.
    """
    connection = get_connection()

    try:
        rows = connection.execute(
            """
            SELECT DISTINCT
                q.question_id,
                q.study_set_id,
                q.document_id,
                q.question_type,
                q.topic,
                q.question,
                q.options,
                q.source_document_ids,
                q.source_chunk_ids,
                q.marks
            FROM questions q
            LEFT JOIN question_sources qs ON q.question_id = qs.question_id
            WHERE qs.document_id = ? OR q.document_id = ?
            ORDER BY q.id
            """,
            (document_id, document_id)
        ).fetchall()

        questions = []

        for row in rows:
            question = dict(row)

            if question.get("options"):
                question["options"] = json.loads(question["options"])
            if question.get("source_document_ids"):
                question["source_document_ids"] = json.loads(question["source_document_ids"])
            else:
                question["source_document_ids"] = []
            if question.get("source_chunk_ids"):
                question["source_chunk_ids"] = json.loads(question["source_chunk_ids"])
            else:
                question["source_chunk_ids"] = []

            sources = connection.execute(
                "SELECT document_id, chunk_id FROM question_sources WHERE question_id = ?",
                (question["question_id"],)
            ).fetchall()
            question["sources"] = [dict(s) for s in sources]

            questions.append(question)

        return questions

    finally:
        connection.close()


def get_question_by_id(question_id: str):
    """
    Retrieve one question including reference answer and canonical sources.
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
                correct_option,
                source_document_ids,
                source_chunk_ids,
                marks
            FROM questions
            WHERE question_id = ?
            LIMIT 1
            """,
            (question_id,)
        ).fetchone()

        if row is None:
            return None

        question = dict(row)

        if question.get("options"):
            question["options"] = json.loads(question["options"])
        if question.get("source_document_ids"):
            question["source_document_ids"] = json.loads(question["source_document_ids"])
        else:
            question["source_document_ids"] = []
        if question.get("source_chunk_ids"):
            question["source_chunk_ids"] = json.loads(question["source_chunk_ids"])
        else:
            question["source_chunk_ids"] = []

        sources = connection.execute(
            "SELECT document_id, chunk_id FROM question_sources WHERE question_id = ?",
            (question_id,)
        ).fetchall()
        question["sources"] = [dict(s) for s in sources]

        return question

    finally:
        connection.close()