import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import requests
from backend.database.study_set_repository import list_study_sets

study_sets = list_study_sets()
if not study_sets:
    print("No study sets found in DB")
    sys.exit(1)

study_set_id = study_sets[0]['study_set_id']
user_id = study_sets[0].get('user_id')
print(f"Testing live server endpoint for study_set_id={study_set_id}, user_id={user_id}")

# Create a mock JWT token format or use a direct request to check server
# In deps.py, get_current_user parses Authorization header.
# Let's inspect deps.py to see how token validation works or use valid supabase config
from backend.api.deps import get_supabase_auth_config

url, key = get_supabase_auth_config()
print(f"Supabase URL: {url}, Key present: {bool(key)}")

# We can test start_attempt directly via FastAPI TestClient as well to verify the live FastAPI app!
from fastapi.testclient import TestClient
from backend.api.main import app
from backend.api.deps import get_current_user, AuthenticatedUser

client = TestClient(app)

# Override get_current_user dependency to simulate authenticated request
app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(user_id=user_id)

response = client.post("/api/attempts", json={"study_set_id": study_set_id})
print("TestClient POST /api/attempts Status Code:", response.status_code)
print("TestClient Response Body:", response.json())
