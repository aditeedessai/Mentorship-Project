import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = ROOT.parent

for p in (str(PROJECT_ROOT), str(ROOT)):
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from backend.database.database import init_db
    from backend.services import study_service
except ModuleNotFoundError:
    from database.database import init_db
    import services.study_service as study_service


def prompt_for_document_path() -> str:
    return study_service.prompt_for_document_path()


def validate_document_path(file_path: str) -> str:
    return study_service.validate_document_path(file_path)


def select_question_type() -> str:
    return study_service.select_question_type()


def run_study_flow(file_path: str) -> None:
    study_service.run_study_flow(file_path)


def main() -> None:
    print("=" * 70)
    print("                 STUDY ENGINE  ")
    print("=" * 70)

    init_db()

    file_path = prompt_for_document_path()

    validated_path = validate_document_path(
        file_path
    )

    run_study_flow(validated_path)


if __name__ == "__main__":
    main()