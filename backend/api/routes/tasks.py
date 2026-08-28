from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status

from backend.api.deps import AuthenticatedUser, get_current_user
from backend.api.schemas.task import (
    CreateTaskRequest,
    DeleteTaskResponse,
    TaskListResponse,
    TaskResponse,
)
from backend.database import task_repository

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.get(
    "",
    response_model=TaskListResponse,
    status_code=status.HTTP_200_OK,
    summary="List today's tasks",
    description="Retrieves tasks due today for the authenticated user."
)
def list_todays_tasks(
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> TaskListResponse:
    try:
        tasks_data = task_repository.get_tasks_for_today(user_id=current_user.user_id)
        return TaskListResponse(tasks=[TaskResponse(**t) for t in tasks_data])
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list tasks: {str(e)}"
        )


@router.post(
    "",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new task",
    description="Creates a new task due today (or on a given date) for the authenticated user."
)
def create_task(
    payload: CreateTaskRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> TaskResponse:
    try:
        due_date = payload.due_date.isoformat() if payload.due_date else None
        data = task_repository.create_task(
            payload.name,
            user_id=current_user.user_id,
            priority=payload.priority,
            due_date=due_date
        )
        return TaskResponse(**data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create task: {str(e)}"
        )


@router.delete(
    "/{task_id}",
    response_model=DeleteTaskResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete a task by ID",
    description="Deletes a specific task by its UUID if owned by the authenticated user. Used to mark a task complete, since completed tasks are not kept."
)
def delete_task(
    task_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> DeleteTaskResponse:
    try:
        deleted = task_repository.delete_task(str(task_id), user_id=current_user.user_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Task with ID '{task_id}' not found"
            )
        return DeleteTaskResponse(
            message="Task deleted successfully",
            task_id=task_id
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete task: {str(e)}"
        )
