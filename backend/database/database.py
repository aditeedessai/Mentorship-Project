import sqlite3
import os


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DB_PATH = os.path.join(
    BASE_DIR,
    "poc.db"
)


def get_connection():
    connection = sqlite3.connect(DB_PATH)

    connection.row_factory = sqlite3.Row

    return connection


def init_db():

    connection = get_connection()

    connection.execute("""
        CREATE TABLE IF NOT EXISTS study_sets (
            study_set_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    connection.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            document_id TEXT PRIMARY KEY,
            study_set_id TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_name TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (study_set_id) REFERENCES study_sets (study_set_id)
        )
    """)

    connection.execute("""
        CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question_id TEXT NOT NULL,
            document_id TEXT,
            study_set_id TEXT,
            question_type TEXT NOT NULL,
            topic TEXT,
            question TEXT NOT NULL,
            reference_answer TEXT NOT NULL,
            options TEXT,
            correct_option TEXT
        )
    """)

    try:
        connection.execute("""
            ALTER TABLE questions
            ADD COLUMN study_set_id TEXT
        """)
    except Exception:
        pass

    connection.execute("""
        CREATE TABLE IF NOT EXISTS evaluations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question_id TEXT NOT NULL,
            student_answer TEXT NOT NULL,
            semantic_score REAL,
            concept_score REAL,
            final_score REAL NOT NULL,
            marks_awarded REAL NOT NULL,
            matched_concepts TEXT,
            missed_concepts TEXT
        )
    """)

    try:
        connection.execute("""
            ALTER TABLE evaluations
            ADD COLUMN attempt_id TEXT
        """)
    except Exception:
        pass

    connection.execute("""
        CREATE TABLE IF NOT EXISTS quiz_attempts (
            attempt_id TEXT PRIMARY KEY,
            document_id TEXT,
            study_set_id TEXT,
            total_marks REAL NOT NULL,
            marks_awarded REAL NOT NULL
        )
    """)

    try:
        connection.execute("""
            ALTER TABLE quiz_attempts
            ADD COLUMN study_set_id TEXT
        """)
    except Exception:
        pass

    # Table for normalized canonical question-to-source relationships
    connection.execute("""
        CREATE TABLE IF NOT EXISTS question_sources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question_id TEXT NOT NULL,
            document_id TEXT NOT NULL,
            chunk_id TEXT,
            FOREIGN KEY (question_id) REFERENCES questions (question_id),
            FOREIGN KEY (document_id) REFERENCES documents (document_id)
        )
    """)

    for col_name, col_type in [
        ("source_document_ids", "TEXT"),
        ("source_chunk_ids", "TEXT"),
        ("marks", "REAL")
    ]:
        try:
            connection.execute(f"ALTER TABLE questions ADD COLUMN {col_name} {col_type}")
        except Exception:
            pass

    # Helpful indexes for result-history/evaluation lookups.
    connection.execute("CREATE INDEX IF NOT EXISTS idx_evaluations_attempt_id ON evaluations(attempt_id)")
    connection.execute("CREATE INDEX IF NOT EXISTS idx_evaluations_question_id ON evaluations(question_id)")
    connection.execute("CREATE INDEX IF NOT EXISTS idx_questions_document_id ON questions(document_id)")
    connection.execute("CREATE INDEX IF NOT EXISTS idx_questions_study_set_id ON questions(study_set_id)")
    connection.execute("CREATE INDEX IF NOT EXISTS idx_documents_study_set_id ON documents(study_set_id)")
    connection.execute("CREATE INDEX IF NOT EXISTS idx_quiz_attempts_study_set_id ON quiz_attempts(study_set_id)")
    connection.execute("CREATE INDEX IF NOT EXISTS idx_question_sources_question_id ON question_sources(question_id)")
    connection.execute("CREATE INDEX IF NOT EXISTS idx_question_sources_document_id ON question_sources(document_id)")
    connection.execute("CREATE INDEX IF NOT EXISTS idx_question_sources_chunk_id ON question_sources(chunk_id)")

    connection.commit()
    connection.close()