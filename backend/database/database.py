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
        CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question_id TEXT NOT NULL,
            document_id TEXT NOT NULL,
            question_type TEXT NOT NULL,
            topic TEXT,
            question TEXT NOT NULL,
            reference_answer TEXT NOT NULL,
            options TEXT,
            correct_option TEXT
        )
    """)

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
            document_id TEXT NOT NULL,
            total_marks REAL NOT NULL,
            marks_awarded REAL NOT NULL
        )
    """)

    # Helpful indexes for result-history/evaluation lookups.
    connection.execute("CREATE INDEX IF NOT EXISTS idx_evaluations_attempt_id ON evaluations(attempt_id)")
    connection.execute("CREATE INDEX IF NOT EXISTS idx_evaluations_question_id ON evaluations(question_id)")
    connection.execute("CREATE INDEX IF NOT EXISTS idx_questions_document_id ON questions(document_id)")

    connection.commit()
    connection.close()