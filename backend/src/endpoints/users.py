"""
User endpoints.

HTTP routes for users.
"""
from typing import Annotated

from fastapi import APIRouter, HTTPException, Path
from pydantic import BaseModel, Field

from src.modules.db_schema import ID_LENGTH, TaskTier

router = APIRouter(prefix="/user", tags=["users"])

USER_ID_T = Annotated[str, Path(min_length=ID_LENGTH, max_length=ID_LENGTH)]
SHORTLIST_DESCRIPTION_LENGTH = 20


class ShortlistTask(BaseModel):
    """A single task entry in a user's shortlist."""

    name: str
    short_description: Annotated[str, Field(max_length=SHORTLIST_DESCRIPTION_LENGTH)]
    time_estimate: Annotated[int, Field(ge=0)]
    distance: Annotated[float, Field(ge=0)]
    image_url: str
    task_tier: TaskTier


TaskShortlist = list[ShortlistTask]


@router.get("/{user_id}/shortlist", response_model=TaskShortlist)
async def get_task_shortlist(user_id: USER_ID_T) -> TaskShortlist:
    """Return the shortlisted tasks for a user."""
    raise HTTPException(
        status_code=501,
        detail="Task shortlist is not implemented yet.",
    )
