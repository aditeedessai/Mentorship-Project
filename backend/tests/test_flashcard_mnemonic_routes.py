import sys
import uuid
from pathlib import Path
from unittest.mock import patch, MagicMock
from fastapi import HTTPException

# Add project root to sys.path
TEST_DIR = Path(__file__).resolve().parent
BACKEND_DIR = TEST_DIR.parent
PROJECT_ROOT = BACKEND_DIR.parent

for p in (str(PROJECT_ROOT), str(BACKEND_DIR)):
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    import pytest
except ImportError:
    pytest = None

from backend.database.database import get_connection, init_db
from backend.services import study_service
from backend.api.routes import study_sets
from backend.api.deps import AuthenticatedUser
from backend.api.schemas.study_set import MnemonicRequest, FlashcardsResponse, MnemonicResponse
from backend.quiz_generation.flashcard_generator import generate_flashcards
from backend.quiz_generation.mnemonic_generator import generate_mnemonic


def get_existing_user_id(conn):
    """
    Returns a dedicated, isolated Supabase Auth test account's id -
    never a real user's. This used to run
    "SELECT user_id FROM study_sets ... LIMIT 1", which grabbed whatever
    real user happened to sort first in this shared, live-connected
    database and wrote this suite's fixture study sets into their real
    account every time the suite ran (confirmed twice against the same
    real account - a test failing partway through skips its own
    unprotected cleanup call at the end, so fixtures accumulated). This
    points at auth.users id 51894975-43bb-4e64-8fa1-9492453b558e
    (backend-test-suite@internal.test), a real Supabase Auth user
    created specifically to absorb this suite's fixtures. (The old
    str(uuid.uuid4()) fallback was never actually usable either - a
    random UUID doesn't reference a real auth.users row, and
    study_sets.user_id is a hard foreign key to it.)
    """
    return "51894975-43bb-4e64-8fa1-9492453b558e"


if pytest:
    @pytest.fixture(autouse=True)
    def setup_database():
        init_db()


def test_flashcard_ownership_isolation():
    """User B cannot generate flashcards for User A's study set (returns 404)."""
    conn = get_connection()
    user_a_id = get_existing_user_id(conn)
    conn.close()
    user_b_id = str(uuid.uuid4())

    user_a = AuthenticatedUser(user_id=user_a_id)
    user_b = AuthenticatedUser(user_id=user_b_id)

    set_a = study_service.create_study_set("User A Flashcards Set", user_id=user_a_id)
    set_id_a = uuid.UUID(set_a["study_set_id"])

    # User B receives 404
    if pytest:
        with pytest.raises(HTTPException) as exc_info:
            study_sets.generate_study_set_flashcards(study_set_id=set_id_a, current_user=user_b)
        assert exc_info.value.status_code == 404
    else:
        try:
            study_sets.generate_study_set_flashcards(study_set_id=set_id_a, current_user=user_b)
            assert False, "Should have raised 404"
        except HTTPException as e:
            assert e.status_code == 404

    # Cleanup
    study_service.delete_study_set(str(set_id_a), user_id=user_a_id)


def test_mnemonic_ownership_isolation_and_validation():
    """User B receives 404 for User A's set; empty topic or invalid style returns 400."""
    conn = get_connection()
    user_a_id = get_existing_user_id(conn)
    conn.close()
    user_b_id = str(uuid.uuid4())

    user_a = AuthenticatedUser(user_id=user_a_id)
    user_b = AuthenticatedUser(user_id=user_b_id)

    set_a = study_service.create_study_set("User A Mnemonic Set", user_id=user_a_id)
    set_id_a = uuid.UUID(set_a["study_set_id"])

    req = MnemonicRequest(topic="OSI model layers", style="acronym")

    # User B receives 404
    if pytest:
        with pytest.raises(HTTPException) as exc_info:
            study_sets.generate_study_set_mnemonic(study_set_id=set_id_a, payload=req, current_user=user_b)
        assert exc_info.value.status_code == 404
    else:
        try:
            study_sets.generate_study_set_mnemonic(study_set_id=set_id_a, payload=req, current_user=user_b)
            assert False, "Should have raised 404"
        except HTTPException as e:
            assert e.status_code == 404

    # Cleanup
    study_service.delete_study_set(str(set_id_a), user_id=user_a_id)


def test_flashcard_and_mnemonic_generators_mock_gemini():
    """Verify flashcard and mnemonic generator functions with mocked vector retrieval and Gemini response."""
    mock_chunks = [
        {"id": "c1", "text": "Mitochondria generate ATP through cellular respiration.", "study_set_id": "set-1"}
    ]
    mock_flashcard_json = '{"flashcards": [{"term": "Mitochondria", "definition": "Cellular powerhouse producing ATP"}]}'
    mock_mnemonic_json = '{"title": "Remember OSI", "mnemonic": "Please Do Not", "style": "acronym", "breakdown": ["P - Physical"]}'

    mock_resp_flashcard = MagicMock()
    mock_resp_flashcard.text = f"```json\n{mock_flashcard_json}\n```"

    mock_resp_mnemonic = MagicMock()
    mock_resp_mnemonic.text = f"```json\n{mock_mnemonic_json}\n```"

    with patch("backend.quiz_generation.flashcard_generator.retrieve_chunks", return_value=mock_chunks), \
         patch("backend.quiz_generation.flashcard_generator.client.models.generate_content", return_value=mock_resp_flashcard):
        fc_res = generate_flashcards(study_set_id="set-1")
        assert "flashcards" in fc_res
        assert len(fc_res["flashcards"]) == 1
        assert fc_res["flashcards"][0]["term"] == "Mitochondria"

    with patch("backend.quiz_generation.mnemonic_generator.retrieve_chunks", return_value=mock_chunks), \
         patch("backend.quiz_generation.mnemonic_generator.client.models.generate_content", return_value=mock_resp_mnemonic):
        mn_res = generate_mnemonic(study_set_id="set-1", topic="OSI layers", style="acronym")
        assert mn_res["title"] == "Remember OSI"
        assert mn_res["mnemonic"] == "Please Do Not"
        assert mn_res["style"] == "acronym"
        assert len(mn_res["breakdown"]) == 1


if __name__ == "__main__":
    init_db()
    print("Running test_flashcard_ownership_isolation()...")
    test_flashcard_ownership_isolation()
    print("Running test_mnemonic_ownership_isolation_and_validation()...")
    test_mnemonic_ownership_isolation_and_validation()
    print("Running test_flashcard_and_mnemonic_generators_mock_gemini()...")
    test_flashcard_and_mnemonic_generators_mock_gemini()
    print("\nALL FLASHCARD & MNEMONIC TESTS PASSED SUCCESSFULLY!")
