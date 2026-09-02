from datetime import date, datetime, time
from typing import Literal
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
    priority: Literal["low", "medium", "high"] = Field(
        "medium",
        description="Task priority: low, medium, or high"
    )
    due_date: date | None = Field(
        None,
        description="Due date for the task (defaults to today if omitted)"
    )
    due_time: time | None = Field(
        None,
        description="Optional due time for the task (HH:MM)"
    )
    study_set_id: UUID | None = Field(
        None,
        description="Optional associated study set UUID"
    )
    task_type: Literal["study", "review", "quiz", "assignment", "other"] = Field(
        "study",
        description="Type of task: study, review, quiz, assignment, or other"
    )


class UpdateTaskRequest(BaseModel):
    name: str | None = Field(
        None,
        min_length=1,
        max_length=255,
        description="Updated name of the task"
    )
    priority: Literal["low", "medium", "high"] | None = Field(
        None,
        description="Task priority: low, medium, or high"
    )
    due_date: date | None = Field(
        None,
        description="Due date for the task"
    )
    due_time: time | None = Field(
        None,
        description="Optional due time for the task (HH:MM)"
    )
    study_set_id: UUID | None = Field(
        None,
        description="Optional associated study set UUID"
    )
    task_type: Literal["study", "review", "quiz", "assignment", "other"] | None = Field(
        None,
        description="Type of task: study, review, quiz, assignment, or other"
    )
    completed: bool | None = Field(
        None,
        description="Completion status"
    )


class CompleteTaskRequest(BaseModel):
    completed: bool = Field(
        ...,
        description="Whether the task is completed"
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
    user_id: UUID = Field(
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
    due_time: time | None = Field(
        None,
        description="Due time for the task if set"
    )
    task_type: str = Field(
        "study",
        description="Task type: study, review, quiz, assignment, or other"
    )
    study_set_id: UUID | None = Field(
        None,
        description="Associated study set ID if linked"
    )
    study_set_name: str | None = Field(
        None,
        description="Associated study set name if linked"
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
        description="List of tasks"
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

