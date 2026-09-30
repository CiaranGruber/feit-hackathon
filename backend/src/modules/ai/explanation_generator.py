"""
Explanation Generator.

Writes the short "Why this?" line shown on every recommendation (FR4).

The bar is that the explanation must cite something real from the profile. A generic "this
looks fun!" is a failure of this component, because the point of the feature is making the
personalisation legible - especially for Wildcard picks, where the user's first reaction is
reasonably "why on earth are you showing me this?".
"""

from __future__ import annotations

import logging

from pydantic import BaseModel, Field

from src.modules.ai import fallbacks
from src.modules.ai.provider import ProviderError, get_provider
from src.modules.ai.types import (
    Activity,
    DIMENSIONS,
    DiscoveryContext,
    DiscoveryProfile,
    Tier,
    normalise_dimensions,
)

_LOGGER = logging.getLogger(__name__)

_MAX_SENTENCES = 2

_TIER_GUIDANCE = {
    Tier.FAMILIAR: (
        "This is a FAMILIAR pick: close to what they already enjoy. Name the specific existing "
        "interest or preference it matches. Be warm but do not oversell - they already know they like this kind of thing."
    ),
    Tier.EXPLORE: (
        "This is an EXPLORE pick: connected to their preferences but introducing something new. "
        "Name the thread connecting it to what they already enjoy, AND name what is new about it. "
        "The user should understand this is a step sideways, not a leap."
    ),
    Tier.WILDCARD: (
        "This is a WILDCARD pick: outside their usual patterns. It is NOT random, so you must make "
        "the real connection explicit - usually a deeper behavioural trait (enjoys focused solo "
        "challenges, likes visible progress) rather than surface topic similarity. Acknowledge the "
        "stretch honestly while making the case for why it could still land."
    ),
}

_SYSTEM = f"""You write the "Why this?" line for activity recommendations in a personal-discovery product.

Rules:
- At most {_MAX_SENTENCES} sentences. Shorter is better.
- Address the user as "you". Warm and direct, never salesy or exclamatory.
- Cite something SPECIFIC from their profile. Never generic praise like "this looks fun" or \
"a great way to explore" - that is the one thing this feature exists to avoid.
- NEVER invent interests. The "Things they already enjoy" list is exhaustive: if it says \
photography and coffee, you may not write "since you enjoy cooking". Do not infer an interest \
from the activity description either - an activity about herbs does not mean the user cooks. \
When no listed interest fits, argue from their preference dimensions instead.
- Do not restate the activity description; the user can already see it.
- Plain prose only. No markdown, no bullet points, no headings, no quotation marks."""


def _describe_profile(profile: DiscoveryProfile, activity: Activity) -> str:
    """Renders the profile with the dimensions this activity actually exercises marked.

    Without this the model tends to reach for whichever trait is highest overall rather than
    whichever one is relevant to the activity in front of it.
    """
    attributes = normalise_dimensions(activity.attributes)
    lines = []
    for dimension in DIMENSIONS:
        marker = "  <- relevant here" if attributes[dimension] >= 0.6 else ""
        lines.append(f"  {dimension}: {profile.dimensions[dimension]:.2f}{marker}")
    return "\n".join(lines)


def _profile_section(profile: DiscoveryProfile, activity: Activity) -> list[str]:
    sections = [
        "User's Discovery Profile (0.0 to 1.0, 0.5 is neutral):",
        _describe_profile(profile, activity),
        f"\nThings they already enjoy: {', '.join(profile.stated_interests) or '(none recorded)'}",
    ]
    if profile.emerging_interests:
        sections.append(f"Recently discovered they enjoy: {', '.join(profile.emerging_interests)}")
    if profile.underexplored:
        sections.append(f"Has not explored much: {', '.join(profile.underexplored)}")
    return sections


def _context_section(context: DiscoveryContext | None) -> list[str]:
    if context is None:
        return []
    stated = [
        f"{label}: {value}" for label, value in (
            ("time available", f"{context.duration_minutes} minutes" if context.duration_minutes else None),
            ("budget", context.budget_level.value if context.budget_level else None),
            ("energy", context.energy_level.value if context.energy_level else None),
            ("who they are with", context.social_context.value if context.social_context else None),
            ("when", context.when),
        ) if value
    ]
    if not stated:
        return []
    return [
        "\nThey asked for this right now with these constraints: " + "; ".join(stated)
        + "\nIf an activity fits those constraints well, mention it briefly."
    ]


def _activity_section(activity: Activity, tier: Tier, label: str = "Recommended activity") -> list[str]:
    attributes = normalise_dimensions(activity.attributes)
    defining = [d for d in DIMENSIONS if attributes[d] >= 0.6]
    sections = [
        f"\n{label}: {activity.name}",
        f"Description: {activity.description}",
        f"Mainly involves: {', '.join(defining) or 'nothing strongly'}",
        f"Takes {activity.duration_min}-{activity.duration_max} minutes, cost {activity.cost_level.value}, "
        f"difficulty {activity.difficulty}/5",
    ]
    if activity.related_interests:
        sections.append(f"Adjacent to: {', '.join(activity.related_interests)}")
    sections.append(_TIER_GUIDANCE[tier])
    return sections


def _prompt(profile: DiscoveryProfile, activity: Activity, tier: Tier, context: DiscoveryContext | None) -> str:
    sections = _profile_section(profile, activity)

    attributes = normalise_dimensions(activity.attributes)
    defining = [d for d in DIMENSIONS if attributes[d] >= 0.6]
    sections += [
        f"\nRecommended activity: {activity.name}",
        f"Description: {activity.description}",
        f"Mainly involves: {', '.join(defining) or 'nothing strongly'}",
        f"Takes {activity.duration_min}-{activity.duration_max} minutes, cost {activity.cost_level.value}, "
        f"difficulty {activity.difficulty}/5",
    ]
    if activity.related_interests:
        sections.append(f"Adjacent to: {', '.join(activity.related_interests)}")
    sections += _context_section(context)
    sections.append(f"\n{_TIER_GUIDANCE[tier]}")
    sections.append('\nWrite the "Why this?" line.')
    return "\n".join(sections)


async def generate_explanation(
    profile: DiscoveryProfile,
    activity: Activity,
    tier: Tier,
    context: DiscoveryContext | None = None,
) -> str:
    """Writes the user-facing reason an activity was recommended.

    :param profile: What the system understands about the user
    :param activity: The recommended activity
    :param tier: Which exploration level this recommendation sits at
    :param context: Optional transient constraints, mentioned only if the activity fits them
    :return: One or two sentences of plain prose. Never raises; falls back to a template.
    """
    provider = get_provider()
    if provider is None:
        return fallbacks.generate_explanation(profile, activity, tier)

    try:
        text = await provider.generate_text(
            system=_SYSTEM,
            prompt=_prompt(profile, activity, tier, context),
            fast=True,
        )
    except ProviderError as exc:
        _LOGGER.warning(f"Explanation generation fell back to a template: {exc}")
        return fallbacks.generate_explanation(profile, activity, tier)

    return _tidy(text) or fallbacks.generate_explanation(profile, activity, tier)


def _tidy(text: str) -> str:
    """Strips the quoting and heading models sometimes wrap the line in."""
    text = text.strip().strip('"').strip()
    for prefix in ("Why this?", "Why this:", "Why this -"):
        if text.lower().startswith(prefix.lower()):
            text = text[len(prefix):].strip()
    return text


# --------------------------------------------------
# Batched generation
# --------------------------------------------------

_BATCH_SYSTEM = _SYSTEM + """

You will be given several recommendations at once. Write one line for each, and return them
keyed by the activity id you were given. Make the lines distinct from one another: the user
sees all three together, so three sentences with the same shape reads as a template."""


class _BatchItem(BaseModel):
    activity_id: str = Field(description="Copy the id exactly as given")
    explanation: str


class _BatchSchema(BaseModel):
    explanations: list[_BatchItem]


def _batch_prompt(
    profile: DiscoveryProfile,
    pairs: list[tuple[Activity, Tier]],
    context: DiscoveryContext | None,
) -> str:
    # The profile block is rendered against the first activity only, since the "relevant
    # here" markers differ per activity; the raw dimension values are the same either way.
    sections = _profile_section(profile, pairs[0][0])
    sections += _context_section(context)
    for activity, tier in pairs:
        sections.append(f"\n--- activity id: {activity.id} ---")
        sections += _activity_section(activity, tier)
    sections.append(f'\nWrite one "Why this?" line for each of the {len(pairs)} activities above.')
    return "\n".join(sections)


async def generate_explanations(
    profile: DiscoveryProfile,
    pairs: list[tuple[Activity, Tier]],
    context: DiscoveryContext | None = None,
) -> list[str]:
    """Writes a "Why this?" line for several recommendations in a single model call.

    One call rather than one per activity, because the free tier limits requests far more
    tightly than tokens: at 15 requests per minute each request is entitled to roughly
    16,000 input tokens, and a single explanation prompt uses a few hundred. Batching a
    three-tier set turns three requests into one at no meaningful token cost.

    Showing the model all three together also helps it vary them, since it can see what it
    has already said.

    :param profile: What the system understands about the user
    :param pairs: The (activity, tier) recommendations to explain, in display order
    :param context: Optional transient constraints
    :return: One explanation per pair, in the same order. Never raises; any activity the
        model omits or mangles falls back to a template.
    """
    if not pairs:
        return []

    provider = get_provider()
    if provider is None:
        return [fallbacks.generate_explanation(profile, activity, tier) for activity, tier in pairs]

    try:
        result = await provider.generate_json(
            schema=_BatchSchema,
            system=_BATCH_SYSTEM,
            prompt=_batch_prompt(profile, pairs, context),
            fast=True,
        )
    except ProviderError as exc:
        _LOGGER.warning(f"Batched explanation generation fell back to templates: {exc}")
        return [fallbacks.generate_explanation(profile, activity, tier) for activity, tier in pairs]

    by_id = {item.activity_id: _tidy(item.explanation) for item in result.explanations}
    explanations = []
    for activity, tier in pairs:
        text = by_id.get(activity.id)
        if not text:
            # The model dropped or renamed an id. Fall back for that one rather than
            # risking an explanation attached to the wrong activity.
            _LOGGER.warning(f"No explanation returned for activity {activity.id!r}; using a template")
            text = fallbacks.generate_explanation(profile, activity, tier)
        explanations.append(text)
    return explanations
