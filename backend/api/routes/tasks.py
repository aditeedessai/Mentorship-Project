from datetime import date
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status

from backend.api.deps import AuthenticatedUser, get_current_user
from backend.api.schemas.task import (
    CompleteTaskRequest,
    CreateTaskRequest,
    DeleteTaskResponse,
    TaskListResponse,
    TaskResponse,
    UpdateTaskRequest,
)
from backend.database import study_set_repository, task_repository

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.get(
    "",
    response_model=TaskListResponse,
    status_code=status.HTTP_200_OK,
    summary="List tasks",
    description="Retrieves tasks for the authenticated user with optional due_date or start_date/end_date range filtering."
)
def list_tasks(
    due_date: date | None = Query(None, description="Optional due date filter (YYYY-MM-DD)"),
    start_date: date | None = Query(None, description="Optional start date for date range"),
    end_date: date | None = Query(None, description="Optional end date for date range"),
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> TaskListResponse:
    try:
        due_date_str = due_date.isoformat() if due_date else None
        start_date_str = start_date.isoformat() if start_date else None
        end_date_str = end_date.isoformat() if end_date else None

        tasks_data = task_repository.get_tasks(
            user_id=current_user.user_id,
            due_date=due_date_str,
            start_date=start_date_str,
            end_date=end_date_str,
        )
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
    description="Creates a new task for the authenticated user."
)
def create_task(
    payload: CreateTaskRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> TaskResponse:
    try:
        study_set_id_str = str(payload.study_set_id) if payload.study_set_id else None
        if study_set_id_str:
            study_set = study_set_repository.get_study_set(study_set_id_str, current_user.user_id)
            if not study_set:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Study set with ID '{payload.study_set_id}' not found or does not belong to user"
                )

        due_date_str = payload.due_date.isoformat() if payload.due_date else None
        due_time_str = payload.due_time.strftime("%H:%M:%S") if payload.due_time else None

        data = task_repository.create_task(
            name=payload.name,
            user_id=current_user.user_id,
            priority=payload.priority,
            due_date=due_date_str,
            due_time=due_time_str,
            study_set_id=study_set_id_str,
            task_type=payload.task_type,
        )
        return TaskResponse(**data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create task: {str(e)}"
        )


@router.patch(
    "/{task_id}",
    response_model=TaskResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a task by ID",
    description="Updates task details (name, priority, due_date, due_time, study_set_id, task_type, completed) for a specific task."
)
def update_task(
    task_id: UUID,
    payload: UpdateTaskRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> TaskResponse:
    try:
        updates = payload.model_dump(exclude_unset=True)

        if "study_set_id" in updates and updates["study_set_id"] is not None:
            study_set_id_str = str(updates["study_set_id"])
            study_set = study_set_repository.get_study_set(study_set_id_str, current_user.user_id)
            if not study_set:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Study set with ID '{updates['study_set_id']}' not found or does not belong to user"
                )
            updates["study_set_id"] = study_set_id_str
        elif "study_set_id" in updates and updates["study_set_id"] is None:
            updates["study_set_id"] = None

        if "due_date" in updates and updates["due_date"] is not None:
            updates["due_date"] = updates["due_date"].isoformat()

        if "due_time" in updates and updates["due_time"] is not None:
            updates["due_time"] = updates["due_time"].strftime("%H:%M:%S")

        updated = task_repository.update_task(
            task_id=str(task_id),
            user_id=current_user.user_id,
            updates=updates
        )

        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Task with ID '{task_id}' not found"
            )

        return TaskResponse(**updated)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update task: {str(e)}"
        )


@router.patch(
    "/{task_id}/complete",
    response_model=TaskResponse,
    status_code=status.HTTP_200_OK,
    summary="Toggle task completion",
    description="Updates the completion status of a task without deleting it."
)
def toggle_task_completion(
    task_id: UUID,
    payload: CompleteTaskRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> TaskResponse:
    try:
        updated = task_repository.toggle_task_completion(
            task_id=str(task_id),
            user_id=current_user.user_id,
            completed=payload.completed
        )

        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Task with ID '{task_id}' not found"
            )

        return TaskResponse(**updated)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to toggle task completion: {str(e)}"
        )


@router.delete(
    "/{task_id}",
    response_model=DeleteTaskResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete a task by ID",
    description="Deletes a specific task by its UUID if owned by the authenticated user."
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

