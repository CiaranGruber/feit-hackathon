"""
Profile Generator.

Turns onboarding answers into the initial Discovery Profile (FR1).

The interesting part is not arithmetic. FR1 asks one creative-versus-analytical slider, but
section 13 of the product document requires ``creative`` and ``analytical`` as independent
values. Resolving that needs the free-text interests read alongside the sliders: someone who
answers "balanced" but lists photography, chess and woodworking should come out high on
creative, analytical and hands_on at once. A slider lookup cannot do that, which is the
reason this component uses a model at all.
"""

from __future__ import annotations

import logging

from pydantic import BaseModel, Field

from src.modules.ai import fallbacks
from src.modules.ai.provider import ProviderError, get_provider
from src.modules.ai.types import (
    CATEGORIES,
    DiscoveryProfile,
    QuestionnaireResponse,
    normalise_dimensions,
)

_LOGGER = logging.getLogger(__name__)

_SYSTEM = """You build a structured Discovery Profile for a personal-discovery product that helps \
people find activities beyond what they already know they like.

You are given a user's onboarding answers. Produce seven preference dimensions, each a float \
from 0.0 to 1.0 where 0.5 is neutral:

- creative: enjoys making, expressing, aesthetic judgement
- analytical: enjoys systems, problem-solving, logic
- hands_on: enjoys physically making and manipulating things
- physical: enjoys bodily exertion (low means relaxed, not inactive)
- social: 0.0 strongly prefers solo, 1.0 strongly prefers company
- outdoor: 0.0 strongly prefers indoors, 1.0 strongly prefers outdoors
- novelty_tolerance: appetite for unfamiliar experiences

Critical rules:
1. creative and analytical are INDEPENDENT axes, not two ends of one scale. The slider gives \
the user's self-reported balance, but their stated interests are stronger evidence. Someone \
listing both artistic and logical interests should score high on BOTH.
2. hands_on has no slider. Infer it entirely from stated interests.
3. Use the full range. Avoid clustering everything near 0.5 - a profile that says nothing \
produces recommendations that say nothing.
4. underexplored MUST be 3-5 values chosen verbatim from this exact list, and nothing else:
craft, creative, food, games, learning, music, nature, outdoor, performance, physical, social, wellbeing
Pick the ones the user's answers do NOT cover. Do not invent your own wording, do not add
descriptive detail, and do not list areas they already engage with. These strings are matched
exactly against the activity catalogue, so "high-exertion physical sports" is useless where
"physical" is correct.
5. summary is one short user-facing line of 3-5 traits separated by " • ", \
e.g. "Creative • Independent • Relaxed • Moderately adventurous". Describe their discovery \
style, not their hobbies."""


class _ProfileSchema(BaseModel):
    """Flat by design: a fixed set of fields guarantees every dimension comes back."""

    creative: float = Field(ge=0.0, le=1.0)
    analytical: float = Field(ge=0.0, le=1.0)
    hands_on: float = Field(ge=0.0, le=1.0)
    physical: float = Field(ge=0.0, le=1.0)
    social: float = Field(ge=0.0, le=1.0)
    outdoor: float = Field(ge=0.0, le=1.0)
    novelty_tolerance: float = Field(ge=0.0, le=1.0)
    normalised_interests: list[str]
    underexplored: list[str] = Field(description=f"3-5 values from: {', '.join(CATEGORIES)}")
    summary: str


def _prompt(response: QuestionnaireResponse) -> str:
    return f"""Onboarding answers:

Stated interests: {", ".join(response.interests) or "(none given)"}
Activity types they picked: {", ".join(response.activity_types) or "(none given)"}

Sliders (1-5):
- Indoor (1) to outdoor (5): {response.indoor_outdoor}
- Solo (1) to social (5): {response.solo_social}
- Relaxed (1) to active (5): {response.active_relaxed}
- Creative (1) to analytical (5): {response.creative_analytical}
- Prefers familiar (1) to seeks unfamiliar (5): {response.novelty}

Typical free time: {response.time_availability_minutes} minutes
Budget preference: {response.budget.value}

Build their Discovery Profile. In normalised_interests, tidy their stated interests into \
clean lowercase tags (for example "taking photos" becomes "photography")."""


async def generate_profile(response: QuestionnaireResponse) -> DiscoveryProfile:
    """Converts onboarding answers into a Discovery Profile.

    :param response: The user's raw questionnaire answers
    :return: A profile with a complete dimension map. Never raises: on any provider failure
        this returns the deterministic profile instead, flagged with ``fallback_used``.
    """
    provider = get_provider()
    if provider is None:
        return fallbacks.generate_profile(response)

    try:
        result = await provider.generate_json(schema=_ProfileSchema, system=_SYSTEM, prompt=_prompt(response))
    except ProviderError as exc:
        _LOGGER.warning(f"Profile generation fell back to the deterministic implementation: {exc}")
        return fallbacks.generate_profile(response)

    dimensions = normalise_dimensions({
        "creative": result.creative,
        "analytical": result.analytical,
        "hands_on": result.hands_on,
        "physical": result.physical,
        "social": result.social,
        "outdoor": result.outdoor,
        "novelty_tolerance": result.novelty_tolerance,
    })
    return DiscoveryProfile(
        dimensions=dimensions,
        stated_interests=result.normalised_interests or [i.strip() for i in response.interests if i.strip()],
        emerging_interests=[],
        # Filtered as well as prompted: an off-vocabulary value would not fail, it would
        # quietly stop the engine's underexplored novelty boost from ever firing.
        underexplored=[c for c in (v.lower().strip() for v in result.underexplored) if c in CATEGORIES],
        typical_duration_minutes=response.time_availability_minutes,
        budget_level=response.budget,
        summary=result.summary or fallbacks.describe_profile(dimensions),
        fallback_used=False,
    )
