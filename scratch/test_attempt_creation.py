import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import uuid
from backend.database.study_set_repository import get_study_set, list_study_sets
from backend.database.attempt_repository import save_attempt, get_attempt

study_sets = list_study_sets()
print("Found study sets in DB:", len(study_sets))

if study_sets:
    ss = study_sets[0]
    ss_id = ss['study_set_id']
    u_id = ss.get('user_id')
    print(f"Testing with study_set_id={ss_id}, user_id={u_id}")

    attempt_id = str(uuid.uuid4())
    print(f"1. Calling save_attempt(attempt_id={attempt_id}, study_set_id={ss_id}, user_id={u_id})...")
    try:
        save_attempt(
            attempt_id=attempt_id,
            total_marks=0.0,
            marks_awarded=0.0,
            study_set_id=ss_id,
            document_id=None,
            status="in_progress",
            user_id=u_id
        )
        print("   save_attempt SUCCESS")
    except Exception as e:
        import traceback
        print("   save_attempt ERROR:")
        traceback.print_exc()

    print(f"2. Calling get_attempt({attempt_id}, user_id={u_id})...")
    att = get_attempt(attempt_id, user_id=u_id)
    print("   get_attempt result:", att)
else:
    print("No study sets found!")
