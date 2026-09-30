"""
Activity Catalogue.

Reads tasks from the database and presents them to the Discovery Engine as ``Activity``
objects.

This exists alongside ``tasks.py`` rather than reusing ``get_available_tasks()`` because the
two have different consumers. That function aggregates user feedback for the API and omits
the task id; the engine needs the id for deduplication and quest records, plus the duration,
cost and difficulty columns it treats as hard constraints. Keeping them separate means the
API shape and the engine's shape can each change without disturbing the other.

Terminology: a "task" in the database is an "activity" to the engine, and a "tag" is one of
the seven preference dimensions. See ``DIMENSIONS`` in ``ai/types.py``.
"""

from __future__ import annotations

import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.app import app
from src.modules.ai.types import DIMENSIONS, Activity, BudgetLevel, normalise_dimensions
from src.modules.db_schema import Tag, Task, TaskTag, TaskTagRelationship

_LOGGER = logging.getLogger(__name__)

_ACTIVITIES: list[Activity] | None = None


class CatalogueError(Exception):
    """Raised when the catalogue cannot be read or is inconsistent."""


def _build(task: Task, tags: list[str], relationships: dict[str, float]) -> Activity:
    """Assembles one Activity from its task row, ordered tags and dimension values."""
    unknown = [name for name in relationships if name not in DIMENSIONS]
    if unknown:
        raise CatalogueError(
            f"Task {task.id!r} has tags outside the dimension vocabulary: {unknown}. "
            f"Valid tags are: {', '.join(DIMENSIONS)}"
        )
    try:
        cost_level = BudgetLevel(task.cost_level)
    except ValueError as exc:
        raise CatalogueError(f"Task {task.id!r} has an invalid cost_level {task.cost_level!r}") from exc

    return Activity(
        id=task.id,
        name=task.name,
        description=task.short_description,
        # The dimensions this task is genuinely about, strongest last. Used for
        # recommendation diversity so one result set does not repeat itself.
        categories=tags,
        # Normalised here so a gap in the seed data cannot produce a missing dimension key
        # and break scoring at request time.
        attributes=normalise_dimensions(relationships),
        duration_min=task.duration_min,
        duration_max=task.duration_max,
        cost_level=cost_level,
        difficulty=task.difficulty,
        related_interests=[i.strip() for i in task.related_interests.split(",") if i.strip()],
    )


def load_activities(force_reload: bool = False) -> list[Activity]:
    """Loads every task from the database as an Activity, and caches the result.

    The whole catalogue is loaded rather than filtered in SQL. The engine ranks candidates
    against each other - closest to a novelty target, not sharing a category with an earlier
    pick - which cannot be expressed as a WHERE clause, and the duplicated filtering would
    drift out of step with ``context_fit``.

    :param force_reload: Re-query even if the catalogue is already cached
    :return: Every task in the catalogue
    :raises CatalogueError: If a task's tags or cost level are invalid
    """
    global _ACTIVITIES
    if _ACTIVITIES is not None and not force_reload:
        return _ACTIVITIES

    with Session(app().db_engine) as session:
        tasks = list(session.scalars(select(Task)))

        # Ordered by position so the strongest dimension ends up last, per the TASK_TAGS
        # convention that the highest position is the most specific.
        tag_rows = session.execute(
            select(TaskTag.task_id, Tag.name)
            .join(Tag, Tag.id == TaskTag.tag_id)
            .order_by(TaskTag.task_id, TaskTag.position)
        ).all()
        tags_by_task: dict[str, list[str]] = {}
        for task_id, tag_name in tag_rows:
            tags_by_task.setdefault(task_id, []).append(tag_name)

        value_rows = session.execute(
            select(TaskTagRelationship.task_id, Tag.name, TaskTagRelationship.value)
            .join(Tag, Tag.id == TaskTagRelationship.tag_id)
        ).all()
        values_by_task: dict[str, dict[str, float]] = {}
        for task_id, tag_name, value in value_rows:
            values_by_task.setdefault(task_id, {})[tag_name] = value

        activities = [
            _build(task, tags_by_task.get(task.id, []), values_by_task.get(task.id, {}))
            for task in tasks
        ]

    if not activities:
        raise CatalogueError(
            "No tasks found in the database. Run 'python scripts/setup_db.py' to create and seed it."
        )

    incomplete = [a.id for a in activities if len(values_by_task.get(a.id, {})) != len(DIMENSIONS)]
    if incomplete:
        # Not fatal - missing dimensions default to neutral - but it silently flattens
        # scoring for those tasks, so it should be visible.
        _LOGGER.warning(
            f"{len(incomplete)} task(s) do not have a value for all {len(DIMENSIONS)} dimensions "
            f"and will score as neutral on the missing ones: {incomplete[:5]}"
        )

    _ACTIVITIES = activities
    _LOGGER.info(f"Loaded {len(activities)} activities from the database")
    return _ACTIVITIES


def get_activity(activity_id: str) -> Activity:
    """Gets one activity by id.

    :raises KeyError: If no activity has that id
    """
    for activity in load_activities():
        if activity.id == activity_id:
            return activity
    raise KeyError(f"Activity '{activity_id}' not found in the catalogue.")


def find_activity(name: str) -> Activity:
    """Gets one activity by exact name. Convenience for demos and tests.

    :raises KeyError: If no activity has that name
    """
    for activity in load_activities():
        if activity.name == name:
            return activity
    raise KeyError(f"Activity named '{name}' not found in the catalogue.")


def all_categories() -> list[str]:
    """Every dimension that at least one activity is prominently about, sorted."""
    return sorted({category for activity in load_activities() for category in activity.categories})
