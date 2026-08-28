from datetime import date, datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class CreateTaskRequest(BaseModel):
    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Name of the task",
        examples=["Review Calculus notes"]
    )
    priority: str = Field(
        "medium",
        description="Task priority: low, medium, or high"
    )
    due_date: date | None = Field(
        None,
        description="Due date for the task (defaults to today if omitted)"
    )


class TaskResponse(BaseModel):
    id: UUID = Field(
        ...,
        description="Unique identifier for the task (UUID)"
    )
    name: str = Field(
        ...,
        description="Name of the task"
    )
    user_id: str = Field(
        ...,
        description="ID of the user who owns the task"
    )
    completed: bool = Field(
        ...,
        description="Whether the task is completed"
    )
    priority: str = Field(
        ...,
        description="Task priority: low, medium, or high"
    )
    due_date: date = Field(
        ...,
        description="Due date for the task"
    )
    created_at: datetime = Field(
        ...,
        description="Timestamp when the task was created (TIMESTAMPTZ)"
    )
    updated_at: datetime = Field(
        ...,
        description="Timestamp when the task was last updated (TIMESTAMPTZ)"
    )

    model_config = ConfigDict(from_attributes=True)


class TaskListResponse(BaseModel):
    tasks: list[TaskResponse] = Field(
        default_factory=list,
        description="List of today's tasks"
    )

    model_config = ConfigDict(from_attributes=True)


class DeleteTaskResponse(BaseModel):
    message: str = Field(
        ...,
        description="Confirmation message for task deletion"
    )
    task_id: UUID = Field(
        ...,
        description="Unique identifier of the deleted task (UUID)"
    )

    model_config = ConfigDict(from_attributes=True)
