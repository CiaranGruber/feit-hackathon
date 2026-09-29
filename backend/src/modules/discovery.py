"""
Discovery Engine.

Ranks catalogue activities and selects one Familiar, one Explore and one Wildcard
recommendation (FR3, FR13).

This is deliberately deterministic. Section 13 of the product document sets the principle
that AI provides reasoning and interpretation while structured data provides consistency and
control, so selection is arithmetic over the profile and the catalogue. The AI layer writes
the "Why this?" prose afterwards; it does not choose.

The scoring shape is the one from section 6:

    Discovery Score = Preference Fit + Context Fit + Novelty + Diversity - Previous Exposure

Each tier wants a different amount of novelty rather than a different formula. Familiar aims
low, Explore aims mid, Wildcard aims high, and each is scored on how close a candidate sits
to its tier's target. Wildcard additionally requires a real connection to the user, because
the product document is emphatic that wildcards must not be random.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field, replace

from src.modules.ai.types import (
    Activity,
    BudgetLevel,
    DIMENSIONS,
    DiscoveryContext,
    DiscoveryProfile,
    EnergyLevel,
    SocialContext,
    Tier,
    clamp,
    normalise_dimensions,
)

_LOGGER = logging.getLogger(__name__)

_BUDGET_ORDER = {BudgetLevel.FREE: 0, BudgetLevel.LOW: 1, BudgetLevel.MEDIUM: 2, BudgetLevel.HIGH: 3}

TIER_ORDER = (Tier.FAMILIAR, Tier.EXPLORE, Tier.WILDCARD)


# --------------------------------------------------
# Tuning
# --------------------------------------------------

@dataclass(frozen=True)
class TierWeights:
    """How one tier balances the scoring factors.

    Weights sum to 1.0 so scores stay comparable across tiers.
    """

    novelty_target: float
    """The amount of novelty this tier is aiming for. Candidates are scored on closeness to it."""
    preference: float
    context: float
    novelty: float
    connection: float
    min_connection: float
    """A candidate below this is rejected unless the tier would otherwise be empty."""


TIER_WEIGHTS: dict[Tier, TierWeights] = {
    # Close to home: fit matters most, novelty should be low.
    Tier.FAMILIAR: TierWeights(novelty_target=0.25, preference=0.50, context=0.30,
                               novelty=0.20, connection=0.00, min_connection=0.00),
    # A step sideways: relevance and novelty balanced, with a real thread back to the user.
    Tier.EXPLORE: TierWeights(novelty_target=0.50, preference=0.35, context=0.25,
                              novelty=0.30, connection=0.10, min_connection=0.25),
    # Further out, but never random: connection carries real weight and a hard floor.
    Tier.WILDCARD: TierWeights(novelty_target=0.85, preference=0.10, context=0.20,
                               novelty=0.40, connection=0.30, min_connection=0.35),
}

DIVERSITY_PENALTY = 0.12
"""Deducted per category already used by an earlier pick in the same result set (FR13)."""

RECENTLY_SHOWN_PENALTY = 0.25
"""Deducted for an activity shown recently but not acted on."""

DISLIKED_PENALTY = 0.45
"""Deducted for an activity explicitly skipped. FR14: a rejection is a signal, not a ban."""

_SALIENCE_FLOOR = 0.6
"""How high an activity attribute must be for the activity to count as being 'about' it."""


# --------------------------------------------------
# Inputs and outputs
# --------------------------------------------------

@dataclass(frozen=True)
class DiscoveryHistory:
    """What the user has already seen and done (FR13).

    Persisted elsewhere; the engine only reads it.
    """

    completed_ids: frozenset[str] = frozenset()
    """Excluded outright - they have already done these."""
    recently_shown_ids: frozenset[str] = frozenset()
    """Penalised, not excluded: a repeat suggestion is weak, not forbidden."""
    disliked_ids: frozenset[str] = frozenset()
    """Heavily penalised but never excluded, per FR14."""
    completed_categories: dict[str, int] = field(default_factory=dict)
    """Category name to completion count, used to judge what is already well explored."""


@dataclass(frozen=True)
class ScoreBreakdown:
    """Why an activity scored what it did.

    Kept on every recommendation so the ranking can be inspected, which matters both for
    tuning and for showing a judge that the engine is reasoning rather than guessing.
    """

    preference_fit: float
    context_fit: float
    novelty: float
    connection: float
    diversity_penalty: float
    exposure_penalty: float
    total: float

    def as_dict(self) -> dict[str, float]:
        return {
            "preference_fit": round(self.preference_fit, 3),
            "context_fit": round(self.context_fit, 3),
            "novelty": round(self.novelty, 3),
            "connection": round(self.connection, 3),
            "diversity_penalty": round(self.diversity_penalty, 3),
            "exposure_penalty": round(self.exposure_penalty, 3),
            "total": round(self.total, 3),
        }


@dataclass(frozen=True)
class Recommendation:
    activity: Activity
    tier: Tier
    score: float
    breakdown: ScoreBreakdown
    explanation: str | None = None
    """Filled in by the AI layer's explanation generator, not by the engine."""


# --------------------------------------------------
# Scoring factors
# --------------------------------------------------

def _salience(attributes: dict[str, float]) -> dict[str, float]:
    """How strongly an activity expresses each dimension, 0.0 at neutral and 1.0 at either extreme.

    Used to weight comparisons so a dimension the activity is indifferent about cannot drag
    the score around.
    """
    return {d: abs(attributes[d] - 0.5) * 2.0 for d in DIMENSIONS}


def preference_fit(profile: DiscoveryProfile, activity: Activity) -> float:
    """How well an activity matches the user's preference dimensions.

    Disagreement is weighted by salience, so a mismatch on something the activity is strongly
    about counts heavily while a mismatch on something it is neutral about barely registers.

    :return: 0.0 (poor match) to 1.0 (strong match)
    """
    attributes = normalise_dimensions(activity.attributes)
    salience = _salience(attributes)
    total_salience = sum(salience.values())
    if total_salience == 0:
        return 0.5  # The activity expresses nothing, so it neither fits nor clashes.
    error = sum(salience[d] * abs(profile.dimensions[d] - attributes[d]) for d in DIMENSIONS)
    return clamp(1.0 - error / total_salience)


def _interest_overlap(profile: DiscoveryProfile, activity: Activity) -> float:
    """Fraction of an activity's related interests the user already holds."""
    related = {i.lower().strip() for i in activity.related_interests if i.strip()}
    if not related:
        return 0.0
    known = {i.lower().strip() for i in (*profile.stated_interests, *profile.emerging_interests)}
    if not known:
        return 0.0
    # Substring matching so "photography" recognises "photo walk".
    hits = sum(1 for r in related if any(r in k or k in r for k in known))
    return clamp(hits / len(related))


def novelty(profile: DiscoveryProfile, activity: Activity, history: DiscoveryHistory) -> float:
    """How new an activity is to this user.

    Three sources, weighted so that what the user has actually done matters more than raw
    dimension distance. Otherwise "novel" would collapse into "bad fit", and the Wildcard tier
    would just surface whatever suits them least.

    :return: 0.0 (very familiar) to 1.0 (entirely new territory)
    """
    interest_novelty = 1.0 - _interest_overlap(profile, activity)

    # Categories they have completed before are familiar; ones flagged underexplored are not.
    underexplored = {c.lower() for c in profile.underexplored}
    scores = []
    for category in activity.categories:
        done = history.completed_categories.get(category, 0)
        if done:
            scores.append(clamp(0.45 / done))      # Repeated exposure keeps reducing novelty.
        elif category.lower() in underexplored:
            scores.append(1.0)                     # Named as a gap by their own answers.
        else:
            # Never completed, but not flagged as a gap either. This must sit near the middle
            # rather than high: on day one a user has completed nothing, so treating every
            # category as strongly novel puts a floor under the score that the Familiar tier
            # can never reach, and the tier collapses into pure preference fit.
            scores.append(0.55)
    category_novelty = sum(scores) / len(scores) if scores else 0.6

    attributes = normalise_dimensions(activity.attributes)
    salience = _salience(attributes)
    total_salience = sum(salience.values())
    dimension_novelty = (
        sum(salience[d] * abs(profile.dimensions[d] - attributes[d]) for d in DIMENSIONS) / total_salience
        if total_salience else 0.5
    )

    return clamp(0.40 * interest_novelty + 0.35 * category_novelty + 0.25 * dimension_novelty)


def connection(profile: DiscoveryProfile, activity: Activity) -> float:
    """The strongest genuine link between the user and an activity.

    This is what stops a Wildcard from being random. It only counts dimensions the activity
    actually exercises, so a mostly-physical activity cannot claim a connection through a
    trait it barely involves.

    :return: 0.0 (no meaningful link) to 1.0 (strong shared trait)
    """
    attributes = normalise_dimensions(activity.attributes)
    defining = [d for d in DIMENSIONS if attributes[d] >= _SALIENCE_FLOOR]
    shared = max((min(profile.dimensions[d], attributes[d]) for d in defining), default=0.0)
    # An adjacent interest is its own kind of connection, even without a shared dimension.
    return clamp(max(shared, _interest_overlap(profile, activity)))


def context_fit(activity: Activity, context: DiscoveryContext | None, profile: DiscoveryProfile) -> tuple[float, bool]:
    """How well an activity suits the user's immediate situation (FR6).

    Falls back to the profile's usual time and budget when no context is supplied, so the
    same function handles both the browsing and the companion paths.

    :return: A (fit, feasible) pair. Infeasible activities are dropped entirely: no
        explanation makes a $60 class work for someone who said they have no money.
    """
    attributes = normalise_dimensions(activity.attributes)
    available = (context.duration_minutes if context and context.duration_minutes
                 else profile.typical_duration_minutes)
    budget = (context.budget_level if context and context.budget_level else profile.budget_level)

    if available is not None and activity.duration_min > available:
        return 0.0, False
    if budget is not None and _BUDGET_ORDER[activity.cost_level] > _BUDGET_ORDER[budget]:
        return 0.0, False

    score = 1.0

    if available is not None:
        # Comfortably inside the window is better than only just fitting.
        if activity.duration_max <= available:
            score -= 0.0
        else:
            score -= 0.15
    if budget is not None and _BUDGET_ORDER[activity.cost_level] == _BUDGET_ORDER[budget]:
        score -= 0.05  # Right at their ceiling.

    if context is not None:
        if context.energy_level is EnergyLevel.LOW:
            score -= 0.45 * attributes["physical"]
        elif context.energy_level is EnergyLevel.HIGH:
            score -= 0.20 * (1.0 - attributes["physical"])

        if context.social_context is SocialContext.SOLO:
            score -= 0.40 * attributes["social"]
        elif context.social_context in (SocialContext.WITH_FRIEND, SocialContext.GROUP,
                                        SocialContext.FAMILY, SocialContext.DATE):
            score -= 0.35 * (1.0 - attributes["social"])

        for preference in context.activity_preference:
            word = preference.lower().strip()
            if word in ("relaxing", "relaxed", "calm", "chill"):
                score -= 0.25 * attributes["physical"]
            elif word in ("active", "energetic", "physical"):
                score -= 0.25 * (1.0 - attributes["physical"])
            elif word in ("creative", "artistic"):
                score -= 0.20 * (1.0 - attributes["creative"])
            elif word in ("outdoors", "outdoor", "outside"):
                score -= 0.25 * (1.0 - attributes["outdoor"])
            elif word in ("social", "together"):
                score -= 0.25 * (1.0 - attributes["social"])

    return clamp(score), True


def _exposure_penalty(activity: Activity, history: DiscoveryHistory) -> float:
    penalty = 0.0
    if activity.id in history.recently_shown_ids:
        penalty += RECENTLY_SHOWN_PENALTY
    if activity.id in history.disliked_ids:
        penalty += DISLIKED_PENALTY
    return penalty


# --------------------------------------------------
# Selection
# --------------------------------------------------

@dataclass(frozen=True)
class _Scored:
    activity: Activity
    preference: float
    context: float
    novelty: float
    connection: float
    exposure: float


def _prepare(
    profile: DiscoveryProfile,
    activities: list[Activity],
    context: DiscoveryContext | None,
    history: DiscoveryHistory,
) -> list[_Scored]:
    """Scores every feasible candidate once, independent of tier."""
    scored = []
    for activity in activities:
        if activity.id in history.completed_ids:
            continue
        fit, feasible = context_fit(activity, context, profile)
        if not feasible:
            continue
        scored.append(_Scored(
            activity=activity,
            preference=preference_fit(profile, activity),
            context=fit,
            novelty=novelty(profile, activity, history),
            connection=connection(profile, activity),
            exposure=_exposure_penalty(activity, history),
        ))
    return scored


def _tier_score(candidate: _Scored, tier: Tier, used_categories: set[str]) -> ScoreBreakdown:
    """Scores one candidate for one tier, given what has already been picked."""
    weights = TIER_WEIGHTS[tier]
    # Closeness to the tier's novelty target, rather than more-is-better.
    novelty_score = 1.0 - abs(candidate.novelty - weights.novelty_target)
    overlap = sum(1 for c in candidate.activity.categories if c in used_categories)
    diversity_penalty = DIVERSITY_PENALTY * overlap

    total = (
        weights.preference * candidate.preference
        + weights.context * candidate.context
        + weights.novelty * novelty_score
        + weights.connection * candidate.connection
        - diversity_penalty
        - candidate.exposure
    )
    return ScoreBreakdown(
        preference_fit=candidate.preference,
        context_fit=candidate.context,
        novelty=candidate.novelty,
        connection=candidate.connection,
        diversity_penalty=diversity_penalty,
        exposure_penalty=candidate.exposure,
        total=total,
    )


def recommend(
    profile: DiscoveryProfile,
    activities: list[Activity] | None = None,
    context: DiscoveryContext | None = None,
    history: DiscoveryHistory | None = None,
) -> list[Recommendation]:
    """Selects one Familiar, one Explore and one Wildcard recommendation.

    Tiers are filled in order so that later picks can be steered away from categories already
    used, which is what keeps the set genuinely varied (FR13).

    :param profile: What the system understands about the user
    :param activities: Candidates. Defaults to the whole catalogue.
    :param context: Optional transient constraints from the companion
    :param history: What the user has already seen and done
    :return: Up to three recommendations, one per tier, best first within each. Returns fewer
        only when the catalogue cannot supply more.
    """
    if activities is None:
        from src.modules.catalogue import load_activities
        activities = load_activities()
    history = history or DiscoveryHistory()

    pool = _prepare(profile, activities, context, history)
    if not pool:
        _LOGGER.warning("No feasible activities for this profile and context")
        return []

    recommendations: list[Recommendation] = []
    used_categories: set[str] = set()
    remaining = list(pool)

    for tier in TIER_ORDER:
        if not remaining:
            break
        weights = TIER_WEIGHTS[tier]
        scored = [(c, _tier_score(c, tier, used_categories)) for c in remaining]

        # Prefer candidates that clear the tier's connection floor, but never return an empty
        # tier over it: a weakly connected Wildcard still beats no Wildcard at all.
        eligible = [(c, b) for c, b in scored if c.connection >= weights.min_connection]
        if not eligible:
            _LOGGER.info(f"No candidate met the {tier.value} connection floor; relaxing it")
            eligible = scored

        best_candidate, best_breakdown = max(eligible, key=lambda pair: pair[1].total)
        recommendations.append(Recommendation(
            activity=best_candidate.activity,
            tier=tier,
            score=best_breakdown.total,
            breakdown=best_breakdown,
        ))
        used_categories.update(best_candidate.activity.categories)
        remaining = [c for c in remaining if c.activity.id != best_candidate.activity.id]

    return recommendations


async def explain(
    profile: DiscoveryProfile,
    recommendations: list[Recommendation],
    context: DiscoveryContext | None = None,
) -> list[Recommendation]:
    """Attaches a "Why this?" line to each recommendation via the AI layer (FR4).

    Separate from ``recommend`` so selection stays synchronous and testable, and so callers
    that do not need prose can skip the model calls entirely.

    :return: The same recommendations with ``explanation`` populated
    """
    from src.modules.ai import generate_explanation

    explained = []
    for recommendation in recommendations:
        text = await generate_explanation(profile, recommendation.activity, recommendation.tier, context)
        explained.append(replace(recommendation, explanation=text))
    return explained
