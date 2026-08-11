import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent

if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


from backend.database.database import init_db
from backend.services.document_service import process_pdf
from backend.services.quiz_service import run_quiz
from backend.services.evaluation_service import run_evaluation


def main():

    print("=" * 70)
    print("                 STUDY ENGINE ")
    print("=" * 70)

    init_db()

#upload
    pdf_path = input(
        "\nEnter the path to your PDF: "
    ).strip().strip('"')

#process pdf
    document_id = process_pdf(pdf_path)

#generate quiz
    questions = run_quiz(document_id)

    if not questions:

        raise RuntimeError(
            "Gemini returned no questions."
        )

#evaluate_quiz
    run_evaluation(
        questions,
        document_id
    )

if __name__ == "__main__":
    main()