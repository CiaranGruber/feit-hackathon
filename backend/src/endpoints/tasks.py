"""
Task endpoints.

HTTP routes for tasks.
"""
from typing import Annotated

from fastapi import APIRouter, HTTPException, Path
from pydantic import BaseModel, Field

from src.modules import tasks
from src.modules.db_schema import ID_LENGTH

router = APIRouter(prefix="/task", tags=["tasks"])

TASK_ID_T = Annotated[str, Path(min_length=ID_LENGTH, max_length=ID_LENGTH)]
USER_ID_T = Annotated[str, Field(min_length=ID_LENGTH, max_length=ID_LENGTH)]
RATING_T = Annotated[int, Field(ge=1, le=5)]
FEEDBACK_TEXT_T = Annotated[str, Field(max_length=300)]


class TaskCompletion(BaseModel):
    """Feedback submitted when a task is completed."""
    user_id: USER_ID_T
    activity_rating: RATING_T
    comment: FEEDBACK_TEXT_T
    recommendation_rating: RATING_T | None = None
    tips: FEEDBACK_TEXT_T | None = None


@router.post("/{task_id}/complete", status_code=204)
async def complete_task(task_id: TASK_ID_T, task_body: TaskCompletion):
    """Accept completion feedback for a task."""
    try:
        tasks.complete_task(
            user_id=task_body.user_id,
            task_id=task_id,
            comment=task_body.comment,
            activity_rating=task_body.activity_rating,
            recommendation_rating=task_body.recommendation_rating,
            tips=task_body.tips,
        )
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
