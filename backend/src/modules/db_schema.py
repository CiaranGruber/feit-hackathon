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
TAG_NAME_LENGTH = 16
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
    """A label that can be attached to tasks and users."""

    __tablename__ = "TAGS"

    id: Mapped[str] = mapped_column(String(ID_LENGTH), primary_key=True)
    name: Mapped[str] = mapped_column(String(TAG_NAME_LENGTH), nullable=False)
    icon_name: Mapped[str] = mapped_column(String(ICON_NAME_LENGTH), nullable=False)


class Task(Base):
    """A task."""

    __tablename__ = "TASKS"

    id: Mapped[str] = mapped_column(String(ID_LENGTH), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    short_description: Mapped[str] = mapped_column(String(SHORT_DESCRIPTION_LENGTH), nullable=False)
    generation_instructions: Mapped[str] = mapped_column(Text, nullable=False)
    image: Mapped[str] = mapped_column(String, nullable=False)


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


class UserTagRelationship(Base):
    """Strength of association between a user and a tag (0–1)."""

    __tablename__ = "USER_TAG_RELATIONSHIPS"
    __table_args__ = (
        CheckConstraint(
            "value >= 0 AND value <= 1",
            name="ck_user_tag_relationship_value_range",
        ),
    )

    user_id: Mapped[str] = mapped_column(
        String(ID_LENGTH),
        ForeignKey("USERS.id"),
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
