import sys
import uuid
from datetime import date, time
from pathlib import Path
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
from backend.database import study_set_repository, task_repository
from backend.api.routes import tasks
from backend.api.deps import AuthenticatedUser
from backend.api.schemas.task import (
    CreateTaskRequest,
    UpdateTaskRequest,
    CompleteTaskRequest,
    TaskResponse,
    TaskListResponse,
    DeleteTaskResponse,
)


def get_existing_user_id(conn) -> str:
    """Retrieve an existing user_id from study_sets or tasks table to satisfy FK constraints if needed."""
    try:
        row = conn.execute("SELECT user_id FROM study_sets WHERE user_id IS NOT NULL LIMIT 1").fetchone()
        if row and row.get("user_id"):
            return str(row["user_id"])
    except Exception:
        pass
    return str(uuid.uuid4())


if pytest:
    @pytest.fixture(autouse=True)
    def setup_database():
        init_db()


def test_task_creation_with_all_fields_and_study_set():
    """Test task creation with due_date, due_time, task_type, priority, and study_set_id."""
    conn = get_connection()
    user_a_id = get_existing_user_id(conn)
    conn.close()

    user_a = AuthenticatedUser(user_id=user_a_id)

    # 1. Create a study set for User A
    set_id_a = str(uuid.uuid4())
    study_set_repository.create_study_set(
        study_set_id=set_id_a,
        name="Calculus Prep",
        user_id=user_a_id,
    )

    try:
        # 2. Create task linked to study set
        req = CreateTaskRequest(
            name="Solve Ch 4 Exercises",
            priority="high",
            due_date=date(2026, 9, 15),
            due_time=time(14, 30),
            study_set_id=uuid.UUID(set_id_a),
            task_type="assignment",
        )

        res = tasks.create_task(payload=req, current_user=user_a)
        assert isinstance(res, TaskResponse)
        assert res.name == "Solve Ch 4 Exercises"
        assert str(res.user_id) == user_a_id
        assert res.priority == "high"
        assert res.due_date == date(2026, 9, 15)
        assert res.due_time == time(14, 30)
        assert res.task_type == "assignment"
        assert str(res.study_set_id) == set_id_a
        assert res.study_set_name == "Calculus Prep"
        assert res.completed is False

        # Cleanup task
        tasks.delete_task(task_id=res.id, current_user=user_a)
    finally:
        study_set_repository.delete_study_set(set_id_a, user_id=user_a_id)


def test_task_study_set_ownership_enforcement():
    """Test that User B cannot associate User A's study set to User B's task."""
    conn = get_connection()
    user_a_id = get_existing_user_id(conn)
    conn.close()

    user_b_id = str(uuid.uuid4())

    user_b = AuthenticatedUser(user_id=user_b_id)

    # Create study set for User A
    set_id_a = str(uuid.uuid4())
    study_set_repository.create_study_set(
        study_set_id=set_id_a,
        name="User A Private Set",
        user_id=user_a_id,
    )

    try:
        req = CreateTaskRequest(
            name="Unauthorized Linking Task",
            study_set_id=uuid.UUID(set_id_a),
        )

        if pytest:
            with pytest.raises(HTTPException) as exc_info:
                tasks.create_task(payload=req, current_user=user_b)
            assert exc_info.value.status_code == 400
        else:
            try:
                tasks.create_task(payload=req, current_user=user_b)
                assert False, "Should have raised 400 Bad Request"
            except HTTPException as e:
                assert e.status_code == 400
    finally:
        study_set_repository.delete_study_set(set_id_a, user_id=user_a_id)


def test_task_listing_and_date_filtering():
    """Test listing all tasks, filtering by date, and user isolation."""
    conn = get_connection()
    user_a_id = get_existing_user_id(conn)
    conn.close()

    user_b_id = str(uuid.uuid4())

    user_a = AuthenticatedUser(user_id=user_a_id)
    user_b = AuthenticatedUser(user_id=user_b_id)

    target_date = date(2026, 10, 1)

    t1 = task_repository.create_task(
        name="Date Filter Task 1",
        user_id=user_a_id,
        due_date=target_date.isoformat(),
    )
    t2 = task_repository.create_task(
        name="Date Filter Task 2",
        user_id=user_a_id,
        due_date="2026-10-05",
    )

    try:
        # 1. User A list all tasks -> returns both
        all_tasks = tasks.list_tasks(due_date=None, start_date=None, end_date=None, current_user=user_a)
        assert isinstance(all_tasks, TaskListResponse)
        task_ids = [str(t.id) for t in all_tasks.tasks]
        assert t1["id"] in task_ids
        assert t2["id"] in task_ids

        # 2. User A filter by specific date -> returns t1 only
        filtered_tasks = tasks.list_tasks(due_date=target_date, start_date=None, end_date=None, current_user=user_a)
        filtered_ids = [str(t.id) for t in filtered_tasks.tasks]
        assert t1["id"] in filtered_ids
        assert t2["id"] not in filtered_ids

        # 3. User B list tasks -> does NOT see User A's tasks
        user_b_tasks = tasks.list_tasks(due_date=None, start_date=None, end_date=None, current_user=user_b)
        b_ids = [str(t.id) for t in user_b_tasks.tasks]
        assert t1["id"] not in b_ids
        assert t2["id"] not in b_ids
    finally:
        task_repository.delete_task(t1["id"], user_id=user_a_id)
        task_repository.delete_task(t2["id"], user_id=user_a_id)


def test_task_update_and_completion_toggle():
    """Test non-destructive completion toggle and task updating."""
    conn = get_connection()
    user_a_id = get_existing_user_id(conn)
    conn.close()

    user_a = AuthenticatedUser(user_id=user_a_id)

    t = task_repository.create_task(
        name="Task To Complete & Update",
        user_id=user_a_id,
        priority="low",
    )
    task_id = uuid.UUID(t["id"])

    try:
        # 1. Toggle complete -> True
        comp_res = tasks.toggle_task_completion(
            task_id=task_id,
            payload=CompleteTaskRequest(completed=True),
            current_user=user_a,
        )
        assert comp_res.completed is True

        # Verify task still exists in DB
        db_task = task_repository.get_task_by_id(str(task_id), user_id=user_a_id)
        assert db_task is not None
        assert db_task["completed"] is True

        # 2. Toggle complete -> False
        uncomp_res = tasks.toggle_task_completion(
            task_id=task_id,
            payload=CompleteTaskRequest(completed=False),
            current_user=user_a,
        )
        assert uncomp_res.completed is False

        # 3. Update task fields
        update_req = UpdateTaskRequest(
            name="Updated Task Name",
            priority="high",
            due_time=time(9, 0),
            task_type="review",
        )
        updated_res = tasks.update_task(
            task_id=task_id,
            payload=update_req,
            current_user=user_a,
        )
        assert updated_res.name == "Updated Task Name"
        assert updated_res.priority == "high"
        assert updated_res.due_time == time(9, 0)
        assert updated_res.task_type == "review"
    finally:
        task_repository.delete_task(str(task_id), user_id=user_a_id)


def test_task_security_isolation():
    """Test that User B cannot read, update, complete, or delete User A's task (returns 404)."""
    conn = get_connection()
    user_a_id = get_existing_user_id(conn)
    conn.close()

    user_b_id = str(uuid.uuid4())

    user_a = AuthenticatedUser(user_id=user_a_id)
    user_b = AuthenticatedUser(user_id=user_b_id)

    t = task_repository.create_task(
        name="User A Security Test Task",
        user_id=user_a_id,
    )
    task_id = uuid.UUID(t["id"])

    try:
        if pytest:
            # User B attempts update
            with pytest.raises(HTTPException) as exc1:
                tasks.update_task(
                    task_id=task_id,
                    payload=UpdateTaskRequest(name="Hacked Name"),
                    current_user=user_b,
                )
            assert exc1.value.status_code == 404

            # User B attempts toggle completion
            with pytest.raises(HTTPException) as exc2:
                tasks.toggle_task_completion(
                    task_id=task_id,
                    payload=CompleteTaskRequest(completed=True),
                    current_user=user_b,
                )
            assert exc2.value.status_code == 404

            # User B attempts delete
            with pytest.raises(HTTPException) as exc3:
                tasks.delete_task(task_id=task_id, current_user=user_b)
            assert exc3.value.status_code == 404
        else:
            try:
                tasks.update_task(
                    task_id=task_id,
                    payload=UpdateTaskRequest(name="Hacked Name"),
                    current_user=user_b,
                )
                assert False, "Should have raised 404"
            except HTTPException as e:
                assert e.status_code == 404

            try:
                tasks.toggle_task_completion(
                    task_id=task_id,
                    payload=CompleteTaskRequest(completed=True),
                    current_user=user_b,
                )
                assert False, "Should have raised 404"
            except HTTPException as e:
                assert e.status_code == 404

            try:
                tasks.delete_task(task_id=task_id, current_user=user_b)
                assert False, "Should have raised 404"
            except HTTPException as e:
                assert e.status_code == 404
    finally:
        task_repository.delete_task(str(task_id), user_id=user_a_id)


if __name__ == "__main__":
    init_db()
    print("Running test_task_creation_with_all_fields_and_study_set()...")
    test_task_creation_with_all_fields_and_study_set()
    print("Running test_task_study_set_ownership_enforcement()...")
    test_task_study_set_ownership_enforcement()
    print("Running test_task_listing_and_date_filtering()...")
    test_task_listing_and_date_filtering()
    print("Running test_task_update_and_completion_toggle()...")
    test_task_update_and_completion_toggle()
    print("Running test_task_security_isolation()...")
    test_task_security_isolation()
    print("\nALL TASKS API & REPOSITORY TESTS PASSED SUCCESSFULLY!")
