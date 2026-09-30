"""
Tests for profile persistence and signal application.
"""
from __future__ import annotations

import pytest
from sqlalchemy.orm import Session

from src.app import app
from src.modules.ai.types import (
    DIMENSIONS,
    BudgetLevel,
    Direction,
    DiscoveryProfile,
    PreferenceSignal,
    Strength,
    empty_dimensions,
    normalise_dimensions,
)
from src.modules.db_schema import Tag, User
from src.modules.profiles import (
    apply_signals,
    get_profile_version,
    get_signals,
    load_profile,
    record_signals,
    save_profile,
)

USER_A = "11111111-1111-1111-1111-111111111111"


def _seed_user():
    """Seeds the user and the seven dimension tags.

    save_profile writes dimension values to USER_TAG_RELATIONSHIPS, so the tags must exist.
    """
    with Session(app().db_engine) as session:
        session.add(User(id=USER_A, first_name="Alice"))
        for index, name in enumerate(DIMENSIONS):
            session.add(Tag(id=f"tag-{index}", name=name, icon_name="icon"))
        session.commit()


def _profile(**dims) -> DiscoveryProfile:
    values = empty_dimensions()
    values.update(dims)
    return DiscoveryProfile(
        dimensions=normalise_dimensions(values),
        stated_interests=["photography", "drawing"],
        underexplored=["physical", "social"],
        typical_duration_minutes=120,
        budget_level=BudgetLevel.LOW,
        summary="Creative • Independent",
    )


def test_load_profile_returns_none_before_onboarding(app_db):
    _seed_user()
    assert load_profile(USER_A) is None
    assert get_profile_version(USER_A) == 0


def test_profile_round_trips_and_versions_increment(app_db):
    _seed_user()
    profile = _profile(creative=0.85, hands_on=0.6)

    assert save_profile(USER_A, profile) == 1
    loaded = load_profile(USER_A)
    assert loaded is not None
    assert loaded.dimensions == profile.dimensions
    assert loaded.stated_interests == ["photography", "drawing"]
    assert loaded.underexplored == ["physical", "social"]
    assert loaded.budget_level is BudgetLevel.LOW
    assert loaded.summary == "Creative • Independent"

    # Saving again replaces rather than duplicating, and bumps the version.
    assert save_profile(USER_A, profile) == 2
    assert get_profile_version(USER_A) == 2


def test_save_profile_rejects_unknown_user(app_db):
    _seed_user()
    with pytest.raises(KeyError):
        save_profile("nobody", _profile())


def test_signals_round_trip(app_db):
    _seed_user()
    signals = [
        PreferenceSignal(direction=Direction.POSITIVE, strength=Strength.STRONG,
                         evidence="loved working with my hands", dimension="hands_on"),
        PreferenceSignal(direction=Direction.POSITIVE, strength=Strength.WEAK,
                         evidence="rated 5/5", interest="pottery"),
        # No subject, so it can never be applied and should not be stored.
        PreferenceSignal(direction=Direction.NEGATIVE, strength=Strength.WEAK, evidence="vague"),
    ]
    record_signals(USER_A, signals)
    stored = get_signals(USER_A)
    assert len(stored) == 2, "subjectless signal should not be persisted"
    assert {s.dimension for s in stored} == {"hands_on", None}


def test_apply_signals_uses_headroom_not_addition(app_db):
    """A strong signal moves a low value more than an already-high one."""
    low = apply_signals(_profile(hands_on=0.2), [
        PreferenceSignal(direction=Direction.POSITIVE, strength=Strength.STRONG,
                         evidence="e", dimension="hands_on")])
    high = apply_signals(_profile(hands_on=0.9), [
        PreferenceSignal(direction=Direction.POSITIVE, strength=Strength.STRONG,
                         evidence="e", dimension="hands_on")])

    low_delta = low.dimensions["hands_on"] - 0.2
    high_delta = high.dimensions["hands_on"] - 0.9
    assert low_delta > high_delta, "movement should scale with remaining headroom"
    assert all(0.0 <= v <= 1.0 for v in low.dimensions.values())


def test_positive_signal_also_widens_novelty(app_db):
    """FR11: a success should widen the discovery space, not narrow it."""
    before = _profile(hands_on=0.5, novelty_tolerance=0.5)
    after = apply_signals(before, [
        PreferenceSignal(direction=Direction.POSITIVE, strength=Strength.STRONG,
                         evidence="e", dimension="hands_on")])
    assert after.dimensions["novelty_tolerance"] > before.dimensions["novelty_tolerance"]


def test_negative_signal_moves_down(app_db):
    before = _profile(social=0.6)
    after = apply_signals(before, [
        PreferenceSignal(direction=Direction.NEGATIVE, strength=Strength.STRONG,
                         evidence="hated the group", dimension="social")])
    assert after.dimensions["social"] < before.dimensions["social"]
    # A negative signal must not widen novelty.
    assert after.dimensions["novelty_tolerance"] == before.dimensions["novelty_tolerance"]


def test_applied_signals_add_emerging_interests_and_clear_underexplored(app_db):
    before = _profile(physical=0.2)
    after = apply_signals(before, [
        PreferenceSignal(direction=Direction.POSITIVE, strength=Strength.MODERATE,
                         evidence="e", dimension="physical"),
        PreferenceSignal(direction=Direction.POSITIVE, strength=Strength.WEAK,
                         evidence="e", interest="Bouldering"),
    ])
    assert "Bouldering" in after.emerging_interests
    assert "physical" not in after.underexplored, "a dimension now moved into is no longer unexplored"
    assert "social" in after.underexplored, "untouched dimensions stay"
    # The input must not be mutated.
    assert before.emerging_interests == []


def test_apply_signals_leaves_all_dimensions_valid(app_db):
    profile = apply_signals(_profile(), [
        PreferenceSignal(direction=Direction.POSITIVE, strength=Strength.STRONG,
                         evidence="e", dimension=d) for d in DIMENSIONS])
    assert set(profile.dimensions) == set(DIMENSIONS)
    assert all(0.0 <= v <= 1.0 for v in profile.dimensions.values())
