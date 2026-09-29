"""
Tasks Module.

All task-related database interactions are defined in this file.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, aliased

from src.app import app
from src.modules.db_schema import (
    COMMENT_LENGTH,
    Tag,
    Task,
    TaskTag,
    TaskTagRelationship,
    User,
    UserTaskCompletion,
)

_LOGGER = logging.getLogger(__name__)


@dataclass(frozen=True)
class AvailableTask:
    """A task available for the user to take on, with aggregated feedback."""

    name: str
    short_description: str
    tags: list[str]
    tag_relationships: dict[str, float]
    tips: list[str]
    recommendation_rating_count: int
    recommendation_rating: float


@dataclass
class _TaskAccumulator:
    name: str
    short_description: str
    tags: dict[int, str]
    tag_relationships: dict[str, float]
    tips: dict[str, str]
    ratings: dict[str, int]


def get_available_tasks() -> list[AvailableTask]:
    """
    Return all tasks with ordered tags and aggregated user feedback.

    Uses a single joined statement, then folds rows in Python so tag and
    completion joins do not double-count feedback. Tags are ordered by
    ``position`` (ascending; last is most specific). ``tag_relationships``
    maps every related tag name to its strength (0–1). When no recommendation
    ratings exist, the average is ``0.0``.

    :return: Available tasks with tags, relationships, tips, and ratings.
    """
    # Keep tags, relationships, and completions in one statement for performance.
    relationship_tag = aliased(Tag)
    stmt = (
        select(
            Task.id,
            Task.name,
            Task.short_description,
            Tag.name.label("tag_name"),
            TaskTag.position,
            relationship_tag.name.label("relationship_tag_name"),
            TaskTagRelationship.value.label("relationship_value"),
            UserTaskCompletion.user_id,
            UserTaskCompletion.tips,
            UserTaskCompletion.recommendation_rating,
        )
        .outerjoin(TaskTag, TaskTag.task_id == Task.id)
        .outerjoin(Tag, Tag.id == TaskTag.tag_id)
        .outerjoin(TaskTagRelationship, TaskTagRelationship.task_id == Task.id)
        .outerjoin(
            relationship_tag,
            relationship_tag.id == TaskTagRelationship.tag_id,
        )
        .outerjoin(UserTaskCompletion, UserTaskCompletion.task_id == Task.id)
        .order_by(Task.id, TaskTag.position)
    )

    with Session(app().db_engine) as session:
        accumulated: dict[str, _TaskAccumulator] = {}
        for row in session.execute(stmt):
            task = accumulated.setdefault(
                row.id,
                _TaskAccumulator(
                    name=row.name,
                    short_description=row.short_description,
                    tags={},
                    tag_relationships={},
                    tips={},
                    ratings={},
                ),
            )
            if row.position is not None and row.tag_name is not None:
                task.tags[row.position] = row.tag_name
            if (
                row.relationship_tag_name is not None
                and row.relationship_value is not None
            ):
                task.tag_relationships[row.relationship_tag_name] = (
                    row.relationship_value
                )
            if row.user_id is not None:
                if row.tips is not None:
                    task.tips[row.user_id] = row.tips
                if row.recommendation_rating is not None:
                    task.ratings[row.user_id] = row.recommendation_rating

        available: list[AvailableTask] = []
        for task in accumulated.values():
            rating_values = list(task.ratings.values())
            count = len(rating_values)
            average = sum(rating_values) / count if count else 0.0
            available.append(
                AvailableTask(
                    name=task.name,
                    short_description=task.short_description,
                    tags=[task.tags[position] for position in sorted(task.tags)],
                    tag_relationships=dict(task.tag_relationships),
                    tips=list(task.tips.values()),
                    recommendation_rating_count=count,
                    recommendation_rating=average,
                )
            )
        return available



def complete_task(
    user_id: str,
    task_id: str,
    comment: str,
    activity_rating: int,
    recommendation_rating: int | None = None,
    tips: str | None = None,
    completion_time: datetime | None = None,
):
    """
    Record that a user has completed a task.

    :param user_id: The completing user's id.
    :param task_id: The completed task's id.
    :param comment: Feedback comment (max 300 characters).
    :param activity_rating: Activity rating from 1 to 5.
    :param recommendation_rating: Optional recommendation rating from 1 to 5.
    :param tips: Optional tips for others (max 300 characters).
    :param completion_time: When the task was completed; defaults to now.
    :raises KeyError: If the user or task does not exist.
    :raises ValueError: If inputs are invalid or the completion already exists.
    """
    if len(comment) > COMMENT_LENGTH:
        raise ValueError(f"Comment must be at most {COMMENT_LENGTH} characters.")
    if tips is not None and len(tips) > COMMENT_LENGTH:
        raise ValueError(f"Tips must be at most {COMMENT_LENGTH} characters.")
    if not 1 <= activity_rating <= 5:
        raise ValueError("Activity rating must be between 1 and 5.")
    if recommendation_rating is not None and not 1 <= recommendation_rating <= 5:
        raise ValueError("Recommendation rating must be between 1 and 5.")

    if completion_time is None:
        completion_time = datetime.now()

    with Session(app().db_engine) as session:
        if session.get(User, user_id) is None:
            raise KeyError(f"User '{user_id}' not found.")
        if session.get(Task, task_id) is None:
            raise KeyError(f"Task '{task_id}' not found.")
        if session.get(UserTaskCompletion, (user_id, task_id)) is not None:
            raise ValueError(
                f"User '{user_id}' has already completed task '{task_id}'."
            )

        session.add(
            UserTaskCompletion(
                user_id=user_id,
                task_id=task_id,
                completion_time=completion_time,
                comment=comment,
                tips=tips,
                activity_rating=activity_rating,
                recommendation_rating=recommendation_rating,
            )
        )
        session.commit()

        _LOGGER.info("User '%s' completed task '%s'.", user_id, task_id)
