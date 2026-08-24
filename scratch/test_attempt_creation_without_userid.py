import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import uuid
from backend.database.study_set_repository import list_study_sets
from backend.database.attempt_repository import save_attempt, get_attempt

study_sets = list_study_sets()
if study_sets:
    ss = study_sets[0]
    ss_id = ss['study_set_id']
    u_id = ss.get('user_id')
    print(f"Testing WITHOUT user_id in save_attempt (as was originally in backend)...")

    attempt_id = str(uuid.uuid4())
    # calling save_attempt without user_id
    save_attempt(
        attempt_id=attempt_id,
        total_marks=0.0,
        marks_awarded=0.0,
        study_set_id=ss_id,
        document_id=None,
        status="in_progress"
        # user_id is omitted!
    )
    print("save_attempt completed.")

    print(f"Now calling get_attempt({attempt_id}, user_id={u_id})...")
    att = get_attempt(attempt_id, user_id=u_id)
    print("get_attempt result:", att)
    if att is None:
        print("FAILED: get_attempt returned None because user_id in DB is NULL while query searched for user_id=", u_id)
