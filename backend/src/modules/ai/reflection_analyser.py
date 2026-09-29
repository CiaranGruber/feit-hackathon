"""
Reflection Analyser.

Reads post-quest feedback and extracts preference signals (FR10).

This is the component that makes the product more than a recommender: it is where "what the
user said they like" becomes "what the user turned out to like". FR10 requires distinguishing
strong evidence from weak, so every signal carries a strength rather than being treated as a
settled fact.

This component emits signals. Applying them to a profile belongs to the profile-update logic,
which owns how fast beliefs move.
"""

from __future__ import annotations

import logging
from typing import Literal

from pydantic import BaseModel, Field

from src.modules.ai import fallbacks
from src.modules.ai.provider import ProviderError, get_provider
from src.modules.ai.types import (
    Activity,
    DIMENSIONS,
    Direction,
    DiscoveryProfile,
    PreferenceSignal,
    ReflectionAnalysis,
    ReflectionInput,
    Strength,
    normalise_dimensions,
)

_LOGGER = logging.getLogger(__name__)

_NONE = "none"

_SYSTEM = """You analyse a user's reflection after they completed a real-world activity, and \
extract what it reveals about their preferences.

Return preference signals. Each signal is about EITHER one dimension OR one free-text interest:

Dimensions: creative, analytical, hands_on, physical, social, outdoor, novelty_tolerance
(set dimension to "none" when the signal is about a topic instead, and put the topic in interest)

Strength - this matters more than anything else you do here:
- strong: they explicitly said they loved or hated it, or expressed genuine surprise. \
Reserve this for unmistakable evidence.
- moderate: clearly positive or negative, but stated in passing.
- weak: mild, ambiguous, or inferred from the rating alone rather than from what they wrote.

Rules:
1. Do not manufacture signals. A short reflection with a middling rating should produce one or \
two weak signals, not five confident ones. Under-reporting is much cheaper than over-reporting.
2. Prefer what they WROTE over what they rated. "Making something with my hands was satisfying" \
is evidence about hands_on; a 5/5 with no comment is only weak evidence about anything.
3. Separate the activity from its qualities. Disliking a loud group class is evidence about \
social settings, not necessarily about the craft itself.
4. Watch for negative signals inside positive reflections, e.g. "loved making it, hated how \
long the talking part was".
5. evidence must quote or closely paraphrase what the user actually wrote or rated. It is shown \
to the user, so it has to be recognisable to them.
6. surprised: true when the outcome contradicts what their profile predicted, or when they say \
so themselves ("I didn't expect to enjoy this").
7. discovered_summary: one short warm sentence addressed to the user about what this suggests, \
e.g. "You may enjoy hands-on creative activities more than we originally thought." If nothing \
meaningful was learned, say so plainly instead of inventing an insight."""


class _SignalSchema(BaseModel):
    dimension: Literal[
        "creative", "analytical", "hands_on", "physical",
        "social", "outdoor", "novelty_tolerance", "none",
    ]
    interest: str = Field(description="Free-text interest tag, or empty string")
    direction: Literal["positive", "negative"]
    strength: Literal["weak", "moderate", "strong"]
    evidence: str


class _ReflectionSchema(BaseModel):
    signals: list[_SignalSchema]
    discovered_summary: str
    surprised: bool


def _prompt(reflection: ReflectionInput, activity: Activity, profile: DiscoveryProfile) -> str:
    attributes = normalise_dimensions(activity.attributes)
    defining = [d for d in DIMENSIONS if attributes[d] >= 0.6]
    difficulty_word = {1: "much too easy", 2: "a bit easy", 3: "just right", 4: "a bit hard", 5: "much too hard"}

    prompt = f"""The user completed this activity:

Activity: {activity.name}
Description: {activity.description}
Categories: {', '.join(activity.categories)}
Mainly involves: {', '.join(defining) or 'nothing strongly'}

Their feedback:
Rating: {reflection.rating}/5
Would do it again: {'yes' if reflection.would_repeat else 'no'}
Difficulty felt: {difficulty_word.get(reflection.perceived_difficulty, 'unknown')}
"""
    if reflection.text and reflection.text.strip():
        prompt += f'\nWhat they wrote: "{reflection.text.strip()}"\n'
    else:
        prompt += "\nThey did not write a reflection. Rely on the rating alone, and keep signals weak.\n"

    prompt += f"""
For context, what the profile currently believes about them:
{chr(10).join(f"  {d}: {profile.dimensions[d]:.2f}" for d in DIMENSIONS)}
Known interests: {', '.join(profile.stated_interests) or '(none recorded)'}

Extract the preference signals."""
    return prompt


async def analyse_reflection(
    reflection: ReflectionInput,
    activity: Activity,
    profile: DiscoveryProfile,
) -> ReflectionAnalysis:
    """Extracts preference signals from post-quest feedback.

    :param reflection: The user's rating and optional written reflection
    :param activity: The activity they completed, used to ground the signals
    :param profile: Current beliefs, used to judge whether the outcome was surprising
    :return: Signals with strengths attached. Never raises.
    """
    provider = get_provider()
    if provider is None:
        return fallbacks.analyse_reflection(reflection, activity, profile)

    try:
        result = await provider.generate_json(
            schema=_ReflectionSchema,
            system=_SYSTEM,
            prompt=_prompt(reflection, activity, profile),
        )
    except ProviderError as exc:
        _LOGGER.warning(f"Reflection analysis fell back to the deterministic implementation: {exc}")
        return fallbacks.analyse_reflection(reflection, activity, profile)

    signals = []
    for raw in result.signals:
        dimension = None if raw.dimension == _NONE else raw.dimension
        interest = raw.interest.strip() or None
        if dimension is None and interest is None:
            continue  # Carries no subject, so it cannot be applied to anything.
        signals.append(PreferenceSignal(
            direction=Direction(raw.direction),
            strength=Strength(raw.strength),
            evidence=raw.evidence.strip(),
            dimension=dimension,
            interest=interest,
        ))

    return ReflectionAnalysis(
        signals=signals,
        discovered_summary=result.discovered_summary.strip(),
        surprised=result.surprised,
        fallback_used=False,
    )
