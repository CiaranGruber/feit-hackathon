"""
AI Layer Types.

Every value crossing the AI layer boundary is defined here. The Discovery Engine, the
profile-update logic and the API layer all read and write these shapes, so treat changes
to this module as breaking changes.

Nothing in this module imports SQLAlchemy or FastAPI: these are plain transport types.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum
from typing import Literal

# --------------------------------------------------
# Dimensions
# --------------------------------------------------

DIMENSIONS: tuple[str, ...] = (
    "creative",           # making, expressing, aesthetic judgement
    "analytical",         # systems, problem-solving, logic
    "hands_on",           # physical making and manipulation
    "physical",           # bodily exertion; low means relaxed rather than inactive
    "social",             # 0.0 strongly solo, 1.0 strongly social
    "outdoor",            # 0.0 strongly indoor, 1.0 strongly outdoor
    "novelty_tolerance",  # appetite for the unfamiliar
)
"""The frozen dimension vocabulary, taken from section 13 of the product document.

Every value is a float in [0.0, 1.0] where 0.5 is neutral. Activity attributes in the
catalogue use these same keys so that profiles and activities can be compared directly.

``creative`` and ``analytical`` are independent axes rather than two ends of one: a user
can legitimately score high on both.
"""

CATEGORIES: tuple[str, ...] = (
    "craft", "creative", "food", "games", "learning", "music",
    "nature", "outdoor", "performance", "physical", "social", "wellbeing",
)
"""The activity category vocabulary, shared with the catalogue.

Like ``DIMENSIONS`` this is a contract, not a suggestion. The Discovery Engine tests
``category in profile.underexplored`` by exact set membership, so a profile describing an
unexplored area as "high-exertion physical sports" rather than "physical" silently loses the
novelty signal instead of failing loudly.
"""

NEUTRAL = 0.5


def empty_dimensions() -> dict[str, float]:
    """A complete dimension map sitting at neutral, used as a starting point."""
    return {name: NEUTRAL for name in DIMENSIONS}


def clamp(value: float) -> float:
    """Constrains a dimension value to the valid [0.0, 1.0] range."""
    return min(1.0, max(0.0, value))


def nudge(value: float, amount: float) -> float:
    """Moves a dimension by a fraction of its remaining headroom.

    Plain addition saturates. Three creative interests, or three positive signals in a row,
    would pin a dimension at 1.00 and erase the difference between a mild preference and a
    defining one - and a dimension stuck at the bound can never register a later negative
    signal proportionately. Scaling by the headroom keeps every additional piece of evidence
    meaningful while approaching, but never reaching, the bound.

    Use this rather than raw addition when applying ``SIGNAL_WEIGHTS``.

    :param value: The current dimension value
    :param amount: Signed step, typically a value from ``SIGNAL_WEIGHTS``
    :return: The updated value, always within [0.0, 1.0]
    """
    if amount >= 0:
        return clamp(value + amount * (1.0 - value))
    return clamp(value + amount * value)


def normalise_dimensions(values: dict[str, float]) -> dict[str, float]:
    """Produces a complete, clamped dimension map from partial or untrusted input.

    Unknown keys are dropped and missing keys default to neutral, so callers never have
    to defend against a malformed map.

    :param values: A possibly incomplete mapping of dimension name to value
    :return: A map containing exactly ``DIMENSIONS``, each clamped to [0.0, 1.0]
    """
    result = empty_dimensions()
    for name in DIMENSIONS:
        raw = values.get(name)
        if isinstance(raw, (int, float)):
            result[name] = clamp(float(raw))
    return result


# --------------------------------------------------
# Enums
# --------------------------------------------------

class BudgetLevel(StrEnum):
    FREE = "free"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class EnergyLevel(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class SocialContext(StrEnum):
    SOLO = "solo"
    WITH_FRIEND = "with_friend"
    GROUP = "group"
    FAMILY = "family"
    DATE = "date"


class Tier(StrEnum):
    """The three exploration levels the Discovery Engine recommends across."""
    FAMILIAR = "familiar"
    EXPLORE = "explore"
    WILDCARD = "wildcard"


class Direction(StrEnum):
    POSITIVE = "positive"
    NEGATIVE = "negative"


class Strength(StrEnum):
    """Evidence weight of a preference signal.

    FR10 requires distinguishing strong from weak evidence so that a single experience
    is not treated as a permanent preference.
    """
    WEAK = "weak"
    MODERATE = "moderate"
    STRONG = "strong"


class Intent(StrEnum):
    ACTIVITY_DISCOVERY = "activity_discovery"
    CURIOSITY = "curiosity"
    REFLECTION = "reflection"
    SMALL_TALK = "small_talk"
    UNCLEAR = "unclear"


class CompanionAction(StrEnum):
    """What the caller should do after a companion turn."""
    NONE = "none"
    REQUEST_RECOMMENDATIONS = "request_recommendations"
    ASK_FOLLOW_UP = "ask_follow_up"
    START_QUEST = "start_quest"
    PROMPT_REFLECTION = "prompt_reflection"


# --------------------------------------------------
# Inputs
# --------------------------------------------------

@dataclass(frozen=True)
class QuestionnaireResponse:
    """Raw onboarding answers, covering every item listed in FR1.

    The four preference fields are 1-5 sliders. Their low end is named in each comment
    so the UI and the profile generator cannot drift apart.
    """

    interests: list[str]
    """Free-text and chip-selected things the user already enjoys."""
    activity_types: list[str]
    """Broad categories the user says appeal to them."""
    indoor_outdoor: int
    """1 = strongly indoor, 5 = strongly outdoor."""
    solo_social: int
    """1 = strongly solo, 5 = strongly social."""
    active_relaxed: int
    """1 = strongly relaxed, 5 = strongly active."""
    creative_analytical: int
    """1 = strongly creative, 5 = strongly analytical."""
    time_availability_minutes: int
    """Typical free time in a single block."""
    budget: BudgetLevel
    """General spending preference."""
    novelty: int
    """1 = prefers the familiar, 5 = actively seeks the unfamiliar."""


@dataclass(frozen=True)
class Activity:
    """A catalogue activity.

    The AI layer consumes this but never produces it; the catalogue owns the data. The
    ``attributes`` map must use the ``DIMENSIONS`` keys so activities and profiles are
    directly comparable.
    """

    id: str
    name: str
    description: str
    categories: list[str]
    attributes: dict[str, float]
    duration_min: int
    """Shortest realistic duration in minutes."""
    duration_max: int
    """Longest realistic duration in minutes."""
    cost_level: BudgetLevel
    difficulty: int
    """1-5, where 1 is approachable by a complete beginner."""
    related_interests: list[str] = field(default_factory=list)
    """Interests this activity is adjacent to, used for novelty and explanation."""


@dataclass(frozen=True)
class ReflectionInput:
    """Post-quest feedback, per FR9. Everything but the rating is optional in practice."""

    rating: int
    """1-5 satisfaction."""
    would_repeat: bool
    perceived_difficulty: int
    """1-5, where 3 is 'just right'."""
    text: str | None = None
    """Optional free-text reflection. This is where the richest signals come from."""


@dataclass(frozen=True)
class ChatTurn:
    role: Literal["user", "companion"]
    content: str


# --------------------------------------------------
# Outputs
# --------------------------------------------------

@dataclass(frozen=True)
class DiscoveryProfile:
    """The platform's structured understanding of a user.

    ``dimensions`` is always complete and clamped, so consumers never need to handle a
    missing key.
    """

    dimensions: dict[str, float]
    stated_interests: list[str]
    """What the user said they enjoy, from onboarding."""
    emerging_interests: list[str] = field(default_factory=list)
    """Interests discovered through reflection rather than stated up front."""
    underexplored: list[str] = field(default_factory=list)
    """Areas with little or no evidence either way."""
    typical_duration_minutes: int | None = None
    budget_level: BudgetLevel | None = None
    summary: str = ""
    """One user-facing line, e.g. 'Creative - Independent - Moderately adventurous'."""
    fallback_used: bool = False
    """True when this was produced without a live model call."""


@dataclass(frozen=True)
class DiscoveryContext:
    """Transient constraints extracted from a companion message (FR6).

    This deliberately supplements the profile rather than overwriting it. Anything the
    user did not state stays ``None`` so the Discovery Engine can layer this over the
    stored profile for a single request without mutating it.
    """

    intent: Intent = Intent.UNCLEAR
    duration_minutes: int | None = None
    budget_level: BudgetLevel | None = None
    energy_level: EnergyLevel | None = None
    social_context: SocialContext | None = None
    when: str | None = None
    """Free text such as 'tonight' or 'tomorrow afternoon'."""
    activity_preference: list[str] = field(default_factory=list)
    novelty_appetite: float | None = None
    """A transient override for ``novelty_tolerance``, not a profile change."""
    missing_fields: list[str] = field(default_factory=list)
    """Fields a short follow-up question could usefully resolve."""
    confidence: float = 0.0
    fallback_used: bool = False

    @property
    def is_actionable(self) -> bool:
        """Whether there is enough here to generate a useful recommendation."""
        return self.intent in (Intent.ACTIVITY_DISCOVERY, Intent.CURIOSITY) and self.confidence >= 0.4


@dataclass(frozen=True)
class PreferenceSignal:
    """One piece of evidence about the user, extracted from a reflection.

    Exactly one of ``dimension`` or ``interest`` carries the subject; the other may be
    ``None``. Signals are emitted here but applied elsewhere.
    """

    direction: Direction
    strength: Strength
    evidence: str
    """The phrase that justified this signal, suitable for showing to the user."""
    dimension: str | None = None
    """A ``DIMENSIONS`` key, when the signal is about a preference axis."""
    interest: str | None = None
    """A free-text interest tag, when the signal is about a topic."""


@dataclass(frozen=True)
class ReflectionAnalysis:
    signals: list[PreferenceSignal]
    discovered_summary: str
    """User-facing, e.g. 'You may enjoy hands-on creative activities more than we thought'."""
    surprised: bool = False
    """Whether the outcome contradicted what the profile predicted."""
    fallback_used: bool = False


@dataclass(frozen=True)
class CompanionReply:
    message: str
    action: CompanionAction = CompanionAction.NONE
    context: DiscoveryContext | None = None
    """Context extracted from this turn, to be passed to the Discovery Engine."""
    follow_up_question: str | None = None
    fallback_used: bool = False


# --------------------------------------------------
# Suggested signal weights
# --------------------------------------------------

SIGNAL_WEIGHTS: dict[Strength, float] = {
    Strength.WEAK: 0.03,
    Strength.MODERATE: 0.07,
    Strength.STRONG: 0.12,
}
"""Suggested per-signal deltas for whoever applies signals to a profile.

Offered as a starting point rather than a rule; the profile-update logic owns the final
behaviour. Apply them with ``nudge`` rather than by addition, so repeated evidence does not
saturate a dimension. Note FR11: a positive signal should also nudge ``novelty_tolerance`` upwards
so that a success widens the discovery space instead of narrowing it onto whatever just
worked.
"""
