from fastapi import APIRouter, Depends, status

from backend.api.deps import AuthenticatedUser, get_current_user
from backend.api.schemas.revision import PlannerRevisionDueItem, PlannerRevisionsDueResponse
from backend.database import study_set_repository
from backend.services import revision_service

router = APIRouter(prefix="/planner", tags=["Planner"])


@router.get(
    "/revisions-due",
    response_model=PlannerRevisionsDueResponse,
    status_code=status.HTTP_200_OK,
    summary="List revision due-dates across all of the user's study sets",
    description=(
        "Aggregates every (study_set, question_type) pair the user has an "
        "active revision schedule for, each with its own next_due_date - "
        "today, overdue, or a future date. Callers filter this down "
        "themselves: the calendar marks each pair on its own next_due_date, "
        "while the daily-schedule/dashboard views filter to next_due_date "
        "<= today (which also naturally carries an overdue pair forward "
        "until it's actually re-attempted). Computed fresh on every call "
        "from revision_schedules, same as revision-status - nothing is "
        "cached or separately persisted for the planner."
    ),
)
def get_revisions_due(
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> PlannerRevisionsDueResponse:
    due = revision_service.get_due_revisions_for_user(current_user.user_id)

    study_sets = study_set_repository.list_study_sets(user_id=current_user.user_id)
    name_by_id = {s["study_set_id"]: s["name"] for s in study_sets}

    items = [
        PlannerRevisionDueItem(
            study_set_id=d["study_set_id"],
            study_set_name=name_by_id.get(d["study_set_id"], "Untitled Study Set"),
            question_type=d["question_type"],
            next_due_date=d["next_due_date"],
            attempts_taken=d["attempts_taken"],
            last_accuracy=d["last_accuracy"],
        )
        for d in due
    ]

    return PlannerRevisionsDueResponse(revisions_due=items)
