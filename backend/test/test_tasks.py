"""
Tests for task module helpers.
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from src.app import app
from src.modules.db_schema import (
    Tag,
    Task,
    TaskTag,
    TaskTagRelationship,
    User,
    UserTaskCompletion,
)
from src.modules.tasks import AvailableTask, get_available_tasks

USER_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
USER_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
TAG_OUTDOOR = "11111111-1111-1111-1111-111111111111"
TAG_SOLO = "22222222-2222-2222-2222-222222222222"
TAG_QUICK = "33333333-3333-3333-3333-333333333333"
TASK_WALK = "44444444-4444-4444-4444-444444444444"
TASK_STRETCH = "55555555-5555-5555-5555-555555555555"


def _seed_base_data():
    with Session(app().db_engine) as session:
        session.add_all(
            [
                User(id=USER_A, first_name="Alice"),
                User(id=USER_B, first_name="Bob"),
                Tag(id=TAG_OUTDOOR, name="Outdoor", icon_name="park"),
                Tag(id=TAG_SOLO, name="Solo", icon_name="person"),
                Tag(id=TAG_QUICK, name="Quick", icon_name="bolt"),
                Task(
                    id=TASK_WALK,
                    name="Sunset walk",
                    short_description="A short golden-hour stroll outdoors.",
                    generation_instructions="Suggest a short outdoor walk.",
                    image="img-sunset-walk",
                ),
                Task(
                    id=TASK_STRETCH,
                    name="Five-minute stretch",
                    short_description="A gentle stretch break with no equipment.",
                    generation_instructions="Guide a five-minute stretch.",
                    image="img-stretch",
                ),
                TaskTag(task_id=TASK_WALK, tag_id=TAG_OUTDOOR, position=0),
                TaskTag(task_id=TASK_WALK, tag_id=TAG_SOLO, position=1),
                TaskTag(task_id=TASK_WALK, tag_id=TAG_QUICK, position=2),
                TaskTag(task_id=TASK_STRETCH, tag_id=TAG_QUICK, position=0),
                TaskTagRelationship(
                    task_id=TASK_WALK, tag_id=TAG_OUTDOOR, value=0.5
                ),
                TaskTagRelationship(
                    task_id=TASK_WALK, tag_id=TAG_SOLO, value=0.75
                ),
                TaskTagRelationship(
                    task_id=TASK_WALK, tag_id=TAG_QUICK, value=1.0
                ),
                TaskTagRelationship(
                    task_id=TASK_STRETCH, tag_id=TAG_OUTDOOR, value=0.0
                ),
                TaskTagRelationship(
                    task_id=TASK_STRETCH, tag_id=TAG_SOLO, value=0.1
                ),
                TaskTagRelationship(
                    task_id=TASK_STRETCH, tag_id=TAG_QUICK, value=1.0
                ),
                UserTaskCompletion(
                    user_id=USER_A,
                    task_id=TASK_WALK,
                    completion_time=datetime(2026, 9, 28, 18, 30),
                    comment="Lovely walk.",
                    tips="Bring a jumper.",
                    activity_rating=5,
                    recommendation_rating=5,
                ),
                UserTaskCompletion(
                    user_id=USER_B,
                    task_id=TASK_WALK,
                    completion_time=datetime(2026, 9, 29, 19, 0),
                    comment="Nice route.",
                    tips=None,
                    activity_rating=4,
                    recommendation_rating=3,
                ),
            ]
        )
        session.commit()


def test_get_available_tasks_empty(app_db):
    assert get_available_tasks() == []


def test_get_available_tasks_aggregates_tags_tips_and_ratings(app_db):
    _seed_base_data()

    result = get_available_tasks()
    by_name = {task.name: task for task in result}

    assert set(by_name) == {"Sunset walk", "Five-minute stretch"}

    walk = by_name["Sunset walk"]
    assert walk == AvailableTask(
        name="Sunset walk",
        short_description="A short golden-hour stroll outdoors.",
        tags=["Outdoor", "Solo", "Quick"],
        tag_relationships={"Outdoor": 0.5, "Solo": 0.75, "Quick": 1.0},
        tips=["Bring a jumper."],
        recommendation_rating_count=2,
        recommendation_rating=4.0,
    )

    stretch = by_name["Five-minute stretch"]
    assert stretch == AvailableTask(
        name="Five-minute stretch",
        short_description="A gentle stretch break with no equipment.",
        tags=["Quick"],
        tag_relationships={"Outdoor": 0.0, "Solo": 0.1, "Quick": 1.0},
        tips=[],
        recommendation_rating_count=0,
        recommendation_rating=0.0,
    )
