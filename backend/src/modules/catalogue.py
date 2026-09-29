"""
Activity Catalogue.

Loads the activity catalogue that the Discovery Engine ranks over.

Activities currently live in ``src/data/activities.json`` rather than the database. The
product document is explicit that the catalogue should be structured data rather than
something an LLM invents per request, and a JSON file provides that without waiting on the
schema. When an activities table exists, this module becomes the seeder for it and callers
do not change.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

from src.modules.ai.types import Activity, BudgetLevel, normalise_dimensions

_LOGGER = logging.getLogger(__name__)

CATALOGUE_FILE = Path(__file__).parent.parent / "data" / "activities.json"

_ACTIVITIES: list[Activity] | None = None


class CatalogueError(Exception):
    """Raised when the catalogue file is missing or malformed."""


def _parse(raw: dict) -> Activity:
    """Builds an Activity from one catalogue entry, normalising its attributes."""
    try:
        return Activity(
            id=raw["id"],
            name=raw["name"],
            description=raw["description"],
            categories=list(raw["categories"]),
            # Normalising here means a typo in the data cannot produce a missing dimension
            # key and break scoring at request time.
            attributes=normalise_dimensions(raw["attributes"]),
            duration_min=int(raw["duration_min"]),
            duration_max=int(raw["duration_max"]),
            cost_level=BudgetLevel(raw["cost_level"]),
            difficulty=int(raw["difficulty"]),
            related_interests=list(raw.get("related_interests", [])),
        )
    except (KeyError, ValueError, TypeError) as exc:
        raise CatalogueError(f"Malformed catalogue entry {raw.get('id', '(no id)')!r}: {exc}") from exc


def load_activities(force_reload: bool = False) -> list[Activity]:
    """Loads and caches the catalogue.

    :param force_reload: Re-read the file even if it is already cached
    :return: Every activity in the catalogue
    :raises CatalogueError: If the file is missing, unreadable or malformed
    """
    global _ACTIVITIES
    if _ACTIVITIES is not None and not force_reload:
        return _ACTIVITIES

    try:
        raw = json.loads(CATALOGUE_FILE.read_text())
    except FileNotFoundError as exc:
        raise CatalogueError(f"Catalogue file not found at {CATALOGUE_FILE}") from exc
    except json.JSONDecodeError as exc:
        raise CatalogueError(f"Catalogue file is not valid JSON: {exc}") from exc

    activities = [_parse(entry) for entry in raw]
    seen: set[str] = set()
    for activity in activities:
        if activity.id in seen:
            raise CatalogueError(f"Duplicate activity id in catalogue: {activity.id!r}")
        seen.add(activity.id)

    _ACTIVITIES = activities
    _LOGGER.info(f"Loaded {len(activities)} activities from the catalogue")
    return _ACTIVITIES


def get_activity(activity_id: str) -> Activity:
    """Gets one activity by id.

    :raises KeyError: If no activity has that id
    """
    for activity in load_activities():
        if activity.id == activity_id:
            return activity
    raise KeyError(f"Activity '{activity_id}' not found in the catalogue.")


def all_categories() -> list[str]:
    """Every distinct category in the catalogue, sorted."""
    return sorted({category for activity in load_activities() for category in activity.categories})
