"""
Database schema definitions.

SQLAlchemy ORM models for the No Idea backend.
"""
from datetime import datetime
from enum import Enum

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

ID_LENGTH = 36
TAG_NAME_LENGTH = 32
ICON_NAME_LENGTH = 64
SHORT_DESCRIPTION_LENGTH = 200
COMMENT_LENGTH = 300


class TaskTier(str, Enum):
    """How familiar a shortlisted task is expected to feel."""

    WILDCARD = "wildcard"
    EXPLORE = "explore"
    FAMILIAR = "familiar"


class Base(DeclarativeBase):
    pass


class User(Base):
    """A registered user."""

    __tablename__ = "USERS"

    id: Mapped[str] = mapped_column(String(ID_LENGTH), primary_key=True)
    first_name: Mapped[str] = mapped_column(String, nullable=False)


class Tag(Base):
    """A label that can be attached to tasks."""

    __tablename__ = "TAGS"

    id: Mapped[str] = mapped_column(String(ID_LENGTH), primary_key=True)
    name: Mapped[str] = mapped_column(String(TAG_NAME_LENGTH), nullable=False)
    icon_name: Mapped[str] = mapped_column(String(ICON_NAME_LENGTH), nullable=False)


class CostLevel(str, Enum):
    """Roughly what a task costs to do."""

    FREE = "free"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Task(Base):
    """A task."""

    __tablename__ = "TASKS"
    __table_args__ = (
        CheckConstraint("duration_min > 0", name="ck_task_duration_min_positive"),
        CheckConstraint("duration_max >= duration_min", name="ck_task_duration_range"),
        CheckConstraint("difficulty >= 1 AND difficulty <= 5", name="ck_task_difficulty_range"),
        CheckConstraint(
            "cost_level IN ('free', 'low', 'medium', 'high')",
            name="ck_task_cost_level_valid",
        ),
    )

    id: Mapped[str] = mapped_column(String(ID_LENGTH), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    short_description: Mapped[str] = mapped_column(String(SHORT_DESCRIPTION_LENGTH), nullable=False)
    generation_instructions: Mapped[str] = mapped_column(Text, nullable=False)
    image: Mapped[str] = mapped_column(String, nullable=False)

    # The Discovery Engine treats duration and cost as hard constraints: an activity that
    # cannot fit the user's stated time or budget is dropped rather than ranked low, since
    # no explanation makes a two-hour class work for someone with twenty minutes.
    duration_min: Mapped[int] = mapped_column(Integer, nullable=False)
    """Shortest realistic duration in minutes."""
    duration_max: Mapped[int] = mapped_column(Integer, nullable=False)
    """Longest realistic duration in minutes."""
    cost_level: Mapped[str] = mapped_column(String(8), nullable=False)
    """One of the ``CostLevel`` values."""
    difficulty: Mapped[int] = mapped_column(Integer, nullable=False)
    """1-5, where 1 is approachable by a complete beginner."""
    related_interests: Mapped[str] = mapped_column(Text, nullable=False, default="")
    """Comma-separated interest tags this task is adjacent to, e.g. "drawing,sculpture".

    Compared against a user's free-text stated interests to judge novelty. Stored as a
    simple list rather than a join table because it is leaf data that is never queried
    relationally - only read back with the task.
    """


class TaskTag(Base):
    """An ordered tag on a task; higher position is more specific."""

    __tablename__ = "TASK_TAGS"
    __table_args__ = (
        UniqueConstraint("task_id", "position", name="uq_task_tag_position"),
        CheckConstraint("position >= 0", name="ck_task_tag_position_non_negative"),
    )

    task_id: Mapped[str] = mapped_column(
        String(ID_LENGTH),
        ForeignKey("TASKS.id"),
        primary_key=True,
    )
    tag_id: Mapped[str] = mapped_column(
        String(ID_LENGTH),
        ForeignKey("TAGS.id"),
        primary_key=True,
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)


class TaskTagRelationship(Base):
    """Strength of association between a task and a tag (0–1)."""

    __tablename__ = "TASK_TAG_RELATIONSHIPS"
    __table_args__ = (
        CheckConstraint(
            "value >= 0 AND value <= 1",
            name="ck_task_tag_relationship_value_range",
        ),
    )

    task_id: Mapped[str] = mapped_column(
        String(ID_LENGTH),
        ForeignKey("TASKS.id"),
        primary_key=True,
    )
    tag_id: Mapped[str] = mapped_column(
        String(ID_LENGTH),
        ForeignKey("TAGS.id"),
        primary_key=True,
    )
    value: Mapped[float] = mapped_column(Float, nullable=False)


class UserTaskCompletion(Base):
    """A user's completion of a task, including feedback ratings."""

    __tablename__ = "USER_TASK_COMPLETIONS"
    __table_args__ = (
        CheckConstraint(
            "activity_rating >= 1 AND activity_rating <= 5",
            name="ck_activity_rating_range",
        ),
        CheckConstraint(
            "recommendation_rating >= 1 AND recommendation_rating <= 5",
            name="ck_recommendation_rating_range",
        ),
    )

    user_id: Mapped[str] = mapped_column(
        String(ID_LENGTH),
        ForeignKey("USERS.id"),
        primary_key=True,
    )
    task_id: Mapped[str] = mapped_column(
        String(ID_LENGTH),
        ForeignKey("TASKS.id"),
        primary_key=True,
    )
    completion_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    comment: Mapped[str] = mapped_column(String(COMMENT_LENGTH), nullable=False)
    tips: Mapped[str | None] = mapped_column(String(COMMENT_LENGTH), nullable=True)
    activity_rating: Mapped[int] = mapped_column(Integer, nullable=False)
    recommendation_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
