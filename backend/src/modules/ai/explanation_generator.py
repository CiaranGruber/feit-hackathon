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
- Never invent facts about the user beyond the profile you are given.
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


def _prompt(profile: DiscoveryProfile, activity: Activity, tier: Tier, context: DiscoveryContext | None) -> str:
    sections = [
        "User's Discovery Profile (0.0 to 1.0, 0.5 is neutral):",
        _describe_profile(profile, activity),
        f"\nThings they already enjoy: {', '.join(profile.stated_interests) or '(none recorded)'}",
    ]
    if profile.emerging_interests:
        sections.append(f"Recently discovered they enjoy: {', '.join(profile.emerging_interests)}")
    if profile.underexplored:
        sections.append(f"Has not explored much: {', '.join(profile.underexplored)}")

    attributes = normalise_dimensions(activity.attributes)
    defining = [d for d in DIMENSIONS if attributes[d] >= 0.6]
    sections += [
        f"\nRecommended activity: {activity.name}",
        f"Description: {activity.description}",
        f"Categories: {', '.join(activity.categories)}",
        f"Mainly involves: {', '.join(defining) or 'nothing strongly'}",
        f"Takes {activity.duration_min}-{activity.duration_max} minutes, cost {activity.cost_level.value}, difficulty {activity.difficulty}/5",
    ]
    if activity.related_interests:
        sections.append(f"Adjacent to: {', '.join(activity.related_interests)}")

    if context is not None:
        stated = [
            f"{label}: {value}" for label, value in (
                ("time available", f"{context.duration_minutes} minutes" if context.duration_minutes else None),
                ("budget", context.budget_level.value if context.budget_level else None),
                ("energy", context.energy_level.value if context.energy_level else None),
                ("who they are with", context.social_context.value if context.social_context else None),
                ("when", context.when),
            ) if value
        ]
        if stated:
            sections.append(
                "\nThey asked for this right now with these constraints: " + "; ".join(stated)
                + "\nIf the activity fits those constraints well, mention it briefly."
            )

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

    # Models occasionally wrap the line in quotes or prefix the heading back at us.
    text = text.strip().strip('"').strip()
    for prefix in ("Why this?", "Why this:", "Why this -"):
        if text.lower().startswith(prefix.lower()):
            text = text[len(prefix):].strip()
    return text or fallbacks.generate_explanation(profile, activity, tier)
