"""
Database schema definitions.

SQLAlchemy ORM models for the No Idea backend.
"""
from datetime import datetime
from enum import Enum

from sqlalchemy import (
    JSON,
    Boolean,
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
    would_repeat: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    """Whether the user would do it again. Feeds reflection signal strength (FR9)."""
    perceived_difficulty: Mapped[int | None] = mapped_column(Integer, nullable=True)
    """1-5, where 3 is 'just right' (FR9)."""


class UserProfile(Base):
    """A user's evolving Discovery Profile (FR2).

    The flexible parts are JSON rather than columns or join tables: the dimension map is
    read and written whole, never queried by key, and the product document explicitly
    sanctions JSON for profile data.
    """

    __tablename__ = "USER_PROFILES"
    __table_args__ = (
        CheckConstraint("version >= 1", name="ck_user_profile_version_positive"),
    )

    user_id: Mapped[str] = mapped_column(
        String(ID_LENGTH),
        ForeignKey("USERS.id"),
        primary_key=True,
    )
    dimensions: Mapped[dict] = mapped_column(JSON, nullable=False)
    """The seven preference dimensions, name to value in [0.0, 1.0]."""
    stated_interests: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    """What the user said they enjoy, from onboarding."""
    emerging_interests: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    """Interests discovered through reflection rather than stated up front."""
    underexplored: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    """Dimension names with little or no evidence either way."""
    typical_duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    budget_level: Mapped[str | None] = mapped_column(String(8), nullable=True)
    summary: Mapped[str] = mapped_column(String(SHORT_DESCRIPTION_LENGTH), nullable=False, default="")
    """One user-facing line describing their discovery style."""
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    """Incremented on every update.

    Lets the before/after comparison in FR12 name which profile produced which
    recommendations, and makes explanation caching safe.
    """
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class ProfileSignal(Base):
    """One piece of evidence about a user, extracted from a reflection (FR10).

    Stored rather than only applied, so the platform can show what it learned and from
    where. Signals are append-only history; the applied result lives on UserProfile.
    """

    __tablename__ = "PROFILE_SIGNALS"
    __table_args__ = (
        CheckConstraint(
            "direction IN ('positive', 'negative')",
            name="ck_profile_signal_direction_valid",
        ),
        CheckConstraint(
            "strength IN ('weak', 'moderate', 'strong')",
            name="ck_profile_signal_strength_valid",
        ),
        CheckConstraint(
            "dimension IS NOT NULL OR interest IS NOT NULL",
            name="ck_profile_signal_has_subject",
        ),
    )

    id: Mapped[str] = mapped_column(String(ID_LENGTH), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(ID_LENGTH), ForeignKey("USERS.id"), nullable=False)
    task_id: Mapped[str | None] = mapped_column(
        String(ID_LENGTH),
        ForeignKey("TASKS.id"),
        nullable=True,
    )
    """The task whose reflection produced this, when there was one."""
    dimension: Mapped[str | None] = mapped_column(String(TAG_NAME_LENGTH), nullable=True)
    """A dimension name, when the signal is about a preference axis."""
    interest: Mapped[str | None] = mapped_column(String(TAG_NAME_LENGTH), nullable=True)
    """A free-text interest tag, when the signal is about a topic."""
    direction: Mapped[str] = mapped_column(String(8), nullable=False)
    strength: Mapped[str] = mapped_column(String(8), nullable=False)
    evidence: Mapped[str] = mapped_column(String(COMMENT_LENGTH), nullable=False)
    """The phrase that justified this signal, suitable for showing to the user."""
    applied: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    """Whether this signal has already been folded into the profile."""
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
