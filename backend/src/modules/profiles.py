"""
Discovery Profiles.

Persists a user's Discovery Profile, records the signals extracted from their reflections,
and applies those signals to move the profile (FR2, FR10, FR11).

This is the half of the loop that makes the product more than a recommender: without it a
reflection changes nothing and the next set of recommendations is identical to the last.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.app import app
from src.modules.ai.types import (
    DIMENSIONS,
    BudgetLevel,
    Direction,
    DiscoveryProfile,
    PreferenceSignal,
    SIGNAL_WEIGHTS,
    Strength,
    normalise_dimensions,
    nudge,
)
from src.modules.db_schema import ProfileSignal, User, UserProfile, UserTaskCompletion
from src.modules.discovery import DiscoveryHistory

_LOGGER = logging.getLogger(__name__)

NOVELTY_SPILLOVER = 0.4
"""Fraction of a positive signal that also lifts ``novelty_tolerance``.

FR11's anti-bubble rule: discovering a new interest should widen the user's discovery space,
not narrow it onto whatever just worked. A success therefore makes them slightly more open
to unfamiliar things in general, rather than only more inclined toward that one dimension.
"""


# --------------------------------------------------
# Persistence
# --------------------------------------------------

def load_profile(user_id: str) -> DiscoveryProfile | None:
    """Loads a user's stored profile.

    :return: The profile, or None if the user has not completed onboarding
    """
    with Session(app().db_engine) as session:
        row = session.get(UserProfile, user_id)
        if row is None:
            return None
        return DiscoveryProfile(
            dimensions=normalise_dimensions(row.dimensions),
            stated_interests=list(row.stated_interests),
            emerging_interests=list(row.emerging_interests),
            underexplored=list(row.underexplored),
            typical_duration_minutes=row.typical_duration_minutes,
            budget_level=BudgetLevel(row.budget_level) if row.budget_level else None,
            summary=row.summary,
        )


def save_profile(user_id: str, profile: DiscoveryProfile) -> int:
    """Stores a profile, creating it or replacing the stored one.

    :return: The profile's new version number
    :raises KeyError: If the user does not exist
    """
    with Session(app().db_engine) as session:
        if session.get(User, user_id) is None:
            raise KeyError(f"User '{user_id}' not found.")

        row = session.get(UserProfile, user_id)
        version = 1 if row is None else row.version + 1
        if row is None:
            row = UserProfile(user_id=user_id, dimensions={}, updated_at=datetime.now())
            session.add(row)

        row.dimensions = dict(profile.dimensions)
        row.stated_interests = list(profile.stated_interests)
        row.emerging_interests = list(profile.emerging_interests)
        row.underexplored = list(profile.underexplored)
        row.typical_duration_minutes = profile.typical_duration_minutes
        row.budget_level = profile.budget_level.value if profile.budget_level else None
        row.summary = profile.summary
        row.version = version
        row.updated_at = datetime.now()
        session.commit()

    _LOGGER.info(f"Saved profile for user '{user_id}' at version {version}")
    return version


def get_profile_version(user_id: str) -> int:
    """The stored profile's version, or 0 when there is no profile yet."""
    with Session(app().db_engine) as session:
        row = session.get(UserProfile, user_id)
        return row.version if row else 0


# --------------------------------------------------
# Signals
# --------------------------------------------------

def record_signals(
    user_id: str,
    signals: list[PreferenceSignal],
    task_id: str | None = None,
    applied: bool = False,
) -> int:
    """Appends extracted signals to the user's signal history.

    Stored rather than only applied, so the platform can show a user what it learned and
    from which experience.

    :return: How many signals were stored
    """
    if not signals:
        return 0
    with Session(app().db_engine) as session:
        for signal in signals:
            if signal.dimension is None and signal.interest is None:
                continue  # No subject, so nothing could ever be applied to it.
            session.add(ProfileSignal(
                id=str(uuid.uuid4()),
                user_id=user_id,
                task_id=task_id,
                dimension=signal.dimension,
                interest=signal.interest,
                direction=signal.direction.value,
                strength=signal.strength.value,
                evidence=signal.evidence[:300],
                applied=applied,
                created_at=datetime.now(),
            ))
        session.commit()
    _LOGGER.info(f"Recorded {len(signals)} signal(s) for user '{user_id}'")
    return len(signals)


def get_signals(user_id: str, limit: int = 50) -> list[PreferenceSignal]:
    """The user's most recent signals, newest first."""
    with Session(app().db_engine) as session:
        rows = session.scalars(
            select(ProfileSignal)
            .where(ProfileSignal.user_id == user_id)
            .order_by(ProfileSignal.created_at.desc())
            .limit(limit)
        ).all()
        return [
            PreferenceSignal(
                direction=Direction(row.direction),
                strength=Strength(row.strength),
                evidence=row.evidence,
                dimension=row.dimension,
                interest=row.interest,
            )
            for row in rows
        ]


# --------------------------------------------------
# Applying signals
# --------------------------------------------------

def apply_signals(profile: DiscoveryProfile, signals: list[PreferenceSignal]) -> DiscoveryProfile:
    """Folds signals into a profile and returns the updated one (FR11).

    Two rules shape this, both from the product document:

    Movement uses ``nudge`` rather than addition, so a step is a fraction of the remaining
    headroom. Repeated evidence therefore cannot saturate a dimension, evidence about
    something already strongly believed moves it little, and a dimension at the bound can
    still register a later negative signal.

    A positive signal also lifts ``novelty_tolerance`` slightly. That is FR11's anti-bubble
    rule: discovering that you like making things should open woodworking, cooking and
    gardening, not narrow everything to pottery.

    :param profile: The profile to update
    :param signals: Signals to apply, typically from one reflection
    :return: A new profile. The input is not modified.
    """
    dimensions = dict(profile.dimensions)
    emerging = list(profile.emerging_interests)
    novelty_lift = 0.0

    for signal in signals:
        step = SIGNAL_WEIGHTS[signal.strength]
        if signal.direction is Direction.NEGATIVE:
            step = -step

        if signal.dimension in DIMENSIONS:
            dimensions[signal.dimension] = nudge(dimensions[signal.dimension], step)
            if step > 0 and signal.dimension != "novelty_tolerance":
                novelty_lift = max(novelty_lift, step * NOVELTY_SPILLOVER)

        if signal.interest and signal.direction is Direction.POSITIVE:
            tag = signal.interest.strip().lower()
            known = {i.lower() for i in (*profile.stated_interests, *emerging)}
            if tag and tag not in known:
                emerging.append(signal.interest.strip())

    if novelty_lift:
        dimensions["novelty_tolerance"] = nudge(dimensions["novelty_tolerance"], novelty_lift)

    # A dimension the user has now moved into is no longer unexplored.
    moved = {d for d in DIMENSIONS if dimensions[d] > profile.dimensions[d] + 0.005}
    underexplored = [d for d in profile.underexplored if d not in moved]

    from dataclasses import replace
    return replace(
        profile,
        dimensions=normalise_dimensions(dimensions),
        emerging_interests=emerging[:8],
        underexplored=underexplored,
    )


# --------------------------------------------------
# History
# --------------------------------------------------

def get_history(user_id: str, recently_shown_ids: frozenset[str] = frozenset()) -> DiscoveryHistory:
    """Builds the engine's history view from the user's completions (FR13).

    A completion rated 1 or 2 counts as disliked, so the engine penalises similar activities
    without excluding the category outright, per FR14.

    :param recently_shown_ids: Recommendations shown but not acted on. Not persisted yet, so
        callers pass these in.
    """
    from src.modules.catalogue import get_activity

    completed: set[str] = set()
    disliked: set[str] = set()
    categories: dict[str, int] = {}

    with Session(app().db_engine) as session:
        rows = session.scalars(
            select(UserTaskCompletion).where(UserTaskCompletion.user_id == user_id)
        ).all()
        for row in rows:
            completed.add(row.task_id)
            if row.activity_rating <= 2:
                disliked.add(row.task_id)
            try:
                activity = get_activity(row.task_id)
            except KeyError:
                continue  # Completed a task no longer in the catalogue.
            for category in activity.categories:
                categories[category] = categories.get(category, 0) + 1

    return DiscoveryHistory(
        completed_ids=frozenset(completed),
        recently_shown_ids=recently_shown_ids,
        disliked_ids=frozenset(disliked),
        completed_categories=categories,
    )
