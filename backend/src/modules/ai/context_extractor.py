"""
Context Extractor.

Converts a companion message into structured, temporary constraints (FR6).

The output supplements the Discovery Profile and never overwrites it. Anything the user did
not say stays None, so the Discovery Engine can layer this over the stored profile for a
single request without changing what the system believes about the user in general.
"""

from __future__ import annotations

import logging
from typing import Literal

from pydantic import BaseModel, Field

from src.modules.ai import fallbacks
from src.modules.ai.provider import ProviderError, get_provider
from src.modules.ai.types import (
    BudgetLevel,
    DiscoveryContext,
    DiscoveryProfile,
    EnergyLevel,
    Intent,
    SocialContext,
    clamp,
)

_LOGGER = logging.getLogger(__name__)

_UNKNOWN = "unknown"

_SYSTEM = """You extract structured context from a message sent to a personal-discovery \
companion. The user is talking about what they might do right now.

Return only what the message actually states or clearly implies. Guessing is worse than \
returning "unknown": these are temporary constraints layered over a stored profile, and a \
wrong guess produces a worse recommendation than no constraint at all.

Intent:
- activity_discovery: wants something to do
- curiosity: curious about a specific thing they saw or heard about
- reflection: talking about something they already did
- small_talk: chatting, no request
- unclear: cannot tell

Fields:
- duration_minutes: 0 if not stated. "a couple of hours" is 120, "all day" is 480.
- budget_level / energy_level / social_context: "unknown" if not stated. Note that "free" \
often refers to free TIME rather than zero cost - only treat it as budget when money is \
clearly meant.
- when: short phrase such as "tonight" or "tomorrow afternoon", or "" if not stated.
- activity_preference: adjectives about the kind of thing wanted, e.g. ["relaxing", "creative"].
- novelty_appetite: -1.0 if not stated. Use high values when they ask to be surprised or want \
something new, low when they want something comfortable and known.
- missing_fields: which of duration_minutes, budget_level, energy_level, social_context would \
most improve a recommendation if you knew them. This drives the companion's follow-up question.
- confidence: how confident you are in this reading overall, 0.0 to 1.0."""


class _ContextSchema(BaseModel):
    """Uses sentinels rather than nullable fields, which schema-constrained decoding handles
    far more reliably. They are converted back to None below."""

    intent: Literal["activity_discovery", "curiosity", "reflection", "small_talk", "unclear"]
    duration_minutes: int = Field(ge=0, description="0 when not stated")
    budget_level: Literal["free", "low", "medium", "high", "unknown"]
    energy_level: Literal["low", "medium", "high", "unknown"]
    social_context: Literal["solo", "with_friend", "group", "family", "date", "unknown"]
    when: str = Field(description="Empty string when not stated")
    activity_preference: list[str]
    novelty_appetite: float = Field(ge=-1.0, le=1.0, description="-1.0 when not stated")
    missing_fields: list[str]
    confidence: float = Field(ge=0.0, le=1.0)


async def extract_context(message: str, profile: DiscoveryProfile | None = None) -> DiscoveryContext:
    """Extracts temporary constraints from a companion message.

    :param message: What the user typed
    :param profile: Optional profile, used only to help interpret vague phrasing
    :return: Context with None for anything unstated. Never raises.
    """
    if not message or not message.strip():
        return DiscoveryContext(intent=Intent.UNCLEAR, missing_fields=["intent"], confidence=0.0)

    provider = get_provider()
    if provider is None:
        return fallbacks.extract_context(message)

    prompt = f'Message: "{message.strip()}"'
    if profile is not None and profile.stated_interests:
        # Context only; the profile must not leak into the extracted constraints.
        prompt += f"\n\nFor interpretation only, this user's known interests are: {', '.join(profile.stated_interests)}"

    try:
        result = await provider.generate_json(schema=_ContextSchema, system=_SYSTEM, prompt=prompt, fast=True)
    except ProviderError as exc:
        _LOGGER.warning(f"Context extraction fell back to the deterministic implementation: {exc}")
        return fallbacks.extract_context(message)

    return DiscoveryContext(
        intent=Intent(result.intent),
        duration_minutes=result.duration_minutes or None,
        budget_level=None if result.budget_level == _UNKNOWN else BudgetLevel(result.budget_level),
        energy_level=None if result.energy_level == _UNKNOWN else EnergyLevel(result.energy_level),
        social_context=None if result.social_context == _UNKNOWN else SocialContext(result.social_context),
        when=result.when.strip() or None,
        activity_preference=result.activity_preference,
        novelty_appetite=None if result.novelty_appetite < 0 else clamp(result.novelty_appetite),
        missing_fields=result.missing_fields,
        confidence=clamp(result.confidence),
        fallback_used=False,
    )
