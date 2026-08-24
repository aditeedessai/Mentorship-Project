import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import requests
from backend.database.study_set_repository import list_study_sets
from backend.api.deps import get_supabase_auth_config

# Get a study set from DB
study_sets = list_study_sets()
if not study_sets:
    print("No study sets found in database!")
    sys.exit(1)

study_set = study_sets[0]
study_set_id = study_set['study_set_id']
user_id = study_set.get('user_id')

print(f"Testing live HTTP request to port 8001 with study_set_id={study_set_id}, user_id={user_id}")

# 1. First test without auth header -> expected 401
res_no_auth = requests.post("http://127.0.0.1:8001/api/attempts", json={"study_set_id": study_set_id})
print("No Auth Header - Status Code:", res_no_auth.status_code, "Body:", res_no_auth.text)

# 2. Test via FastAPI TestClient (bypassing Supabase remote auth check, but exercising full route + repo flow)
from fastapi.testclient import TestClient
from backend.api.main import app
from backend.api.deps import get_current_user, AuthenticatedUser

app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(user_id=user_id)
client = TestClient(app)

res_app = client.post("/api/attempts", json={"study_set_id": study_set_id})
print("TestClient Request URL: http://127.0.0.1:8001/api/attempts")
print("TestClient HTTP Method: POST")
print("TestClient Status Code:", res_app.status_code)
print("TestClient Request Body:", {"study_set_id": study_set_id})
print("TestClient Response Body:", res_app.json())
