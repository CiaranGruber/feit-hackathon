"""
Deterministic AI Fallbacks.

Every component in the AI layer has a non-model implementation here. They run when there
is no API key, when the provider is set to 'stub', and whenever a live call fails.

This is what stops a rate limit or a dropped connection from breaking a demo, and it means
the product runs end to end before any key is configured. The results are plainer than the
model's, never absent.
"""

from __future__ import annotations

import re

from src.modules.ai.types import (
    Activity,
    BudgetLevel,
    ChatTurn,
    CompanionAction,
    CompanionReply,
    DIMENSIONS,
    Direction,
    DiscoveryContext,
    DiscoveryProfile,
    EnergyLevel,
    Intent,
    PreferenceSignal,
    QuestionnaireResponse,
    ReflectionAnalysis,
    ReflectionInput,
    SocialContext,
    Strength,
    Tier,
    clamp,
    empty_dimensions,
    normalise_dimensions,
    nudge,
)

# --------------------------------------------------
# Keyword tables
# --------------------------------------------------

_INTEREST_HINTS: dict[str, dict[str, float]] = {
    "photography": {"creative": 0.25, "outdoor": 0.10},
    "photo": {"creative": 0.25, "outdoor": 0.10},
    "drawing": {"creative": 0.30, "hands_on": 0.15},
    "sketch": {"creative": 0.30, "hands_on": 0.15},
    "paint": {"creative": 0.30, "hands_on": 0.20},
    "pottery": {"creative": 0.25, "hands_on": 0.35},
    "craft": {"creative": 0.20, "hands_on": 0.35},
    "knit": {"creative": 0.20, "hands_on": 0.35},
    "woodwork": {"hands_on": 0.40, "creative": 0.15},
    "cook": {"hands_on": 0.30, "creative": 0.20},
    "baking": {"hands_on": 0.30, "creative": 0.20},
    "garden": {"hands_on": 0.30, "outdoor": 0.30},
    "music": {"creative": 0.30},
    "guitar": {"creative": 0.25, "hands_on": 0.25},
    "sing": {"creative": 0.25, "social": 0.15},
    "danc": {"physical": 0.30, "creative": 0.20, "social": 0.20},
    "writing": {"creative": 0.30},
    "read": {"analytical": 0.15},
    "coding": {"analytical": 0.35},
    "program": {"analytical": 0.35},
    "puzzle": {"analytical": 0.30},
    "chess": {"analytical": 0.35},
    "board game": {"analytical": 0.20, "social": 0.25},
    "science": {"analytical": 0.30},
    "hik": {"physical": 0.30, "outdoor": 0.40},
    "walk": {"physical": 0.15, "outdoor": 0.30},
    "run": {"physical": 0.40, "outdoor": 0.25},
    "climb": {"physical": 0.40, "outdoor": 0.20},
    "boulder": {"physical": 0.40},
    "cycl": {"physical": 0.35, "outdoor": 0.35},
    "swim": {"physical": 0.35},
    "yoga": {"physical": 0.20},
    "gym": {"physical": 0.40},
    "sport": {"physical": 0.35, "social": 0.25},
    "football": {"physical": 0.35, "social": 0.30},
    "camp": {"outdoor": 0.45},
    "travel": {"outdoor": 0.20, "novelty_tolerance": 0.20},
    "cafe": {"social": 0.15},
    "café": {"social": 0.15},
    "coffee": {"social": 0.15},
    "film": {"creative": 0.15},
    "movie": {"creative": 0.10},
    "museum": {"analytical": 0.15, "creative": 0.15},
    "volunteer": {"social": 0.30},
    "language": {"analytical": 0.25},
}
"""Substring hints from stated interests to dimension nudges.

Deliberately coarse: this is a floor under the model, not a replacement for it.
"""

_HANDS_ON_KEYWORDS = ("craft", "making", "cooking", "building", "art")

_UNDEREXPLORED_THRESHOLD = 0.4
"""Below this, a dimension counts as somewhere the user has not gone."""


# --------------------------------------------------
# Helpers
# --------------------------------------------------

def _slider(value: int) -> float:
    """Maps a 1-5 slider onto 0.0-1.0."""
    return clamp((value - 1) / 4.0)


def _texts(*values: str | None) -> str:
    return " ".join(v for v in values if v).lower()


# --------------------------------------------------
# Profile Generator
# --------------------------------------------------

def generate_profile(response: QuestionnaireResponse) -> DiscoveryProfile:
    """Builds a profile arithmetically from slider positions plus keyword hints.

    The sliders set the baseline; stated interests nudge it. This cannot do what the model
    does — read 'balanced' alongside a list of photography, chess and woodworking and infer
    that creative, analytical and hands_on are all genuinely high — but it is never wrong
    in a way that breaks the loop.
    """
    dimensions = empty_dimensions()
    dimensions["outdoor"] = _slider(response.indoor_outdoor)
    dimensions["social"] = _slider(response.solo_social)
    dimensions["physical"] = _slider(response.active_relaxed)
    dimensions["novelty_tolerance"] = _slider(response.novelty)

    # A single slider has to seed two independent axes, so treat it as a balance point.
    analytical_bias = _slider(response.creative_analytical)
    dimensions["analytical"] = analytical_bias
    dimensions["creative"] = 1.0 - analytical_bias

    interests = [i.strip() for i in response.interests if i and i.strip()]
    haystack = _texts(*interests, *response.activity_types)
    for keyword, nudges in _matched_hints(haystack):
        for dimension, amount in nudges.items():
            dimensions[dimension] = nudge(dimensions[dimension], amount)

    if any(category in haystack for category in _HANDS_ON_KEYWORDS):
        dimensions["hands_on"] = nudge(dimensions["hands_on"], 0.20)

    return DiscoveryProfile(
        dimensions=normalise_dimensions(dimensions),
        stated_interests=interests,
        emerging_interests=[],
        # Dimensions the user scores low on, which is what discovery should stretch.
        underexplored=[d for d in DIMENSIONS if dimensions[d] < _UNDEREXPLORED_THRESHOLD][:4],
        typical_duration_minutes=response.time_availability_minutes,
        budget_level=response.budget,
        summary=describe_profile(dimensions),
        fallback_used=True,
    )


def _matched_hints(haystack: str) -> list[tuple[str, dict[str, float]]]:
    """Finds interest hints, counting overlapping keys only once.

    Several keys are substrings of others ("photo" of "photography"), which would otherwise
    apply the same nudge twice and inflate the dimension.
    """
    matched = [k for k in sorted(_INTEREST_HINTS, key=len, reverse=True) if k in haystack]
    kept: list[str] = []
    for keyword in matched:
        if not any(keyword in longer for longer in kept):
            kept.append(keyword)
    return [(k, _INTEREST_HINTS[k]) for k in kept]


def describe_profile(dimensions: dict[str, float]) -> str:
    """Renders a short user-facing discovery-style line from dimension values."""
    labels: list[str] = []
    if dimensions.get("creative", 0.5) >= 0.6:
        labels.append("Creative")
    if dimensions.get("analytical", 0.5) >= 0.6:
        labels.append("Analytical")
    if dimensions.get("hands_on", 0.5) >= 0.6:
        labels.append("Hands-on")
    labels.append("Social" if dimensions.get("social", 0.5) >= 0.55 else "Independent")
    labels.append("Active" if dimensions.get("physical", 0.5) >= 0.55 else "Relaxed")
    novelty = dimensions.get("novelty_tolerance", 0.5)
    if novelty >= 0.7:
        labels.append("Adventurous")
    elif novelty >= 0.45:
        labels.append("Moderately adventurous")
    else:
        labels.append("Prefers the familiar")
    return " • ".join(labels)


# --------------------------------------------------
# Context Extractor
# --------------------------------------------------

_DURATION_WORDS = {
    "half an hour": 30, "an hour": 60, "a couple of hours": 120,
    "couple of hours": 120, "all day": 480, "a few hours": 180,
}

_NUMBER_WORDS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6,
    "seven": 7, "eight": 8, "nine": 9, "ten": 10, "twelve": 12,
}

_BUDGET_WORDS: dict[BudgetLevel, tuple[str, ...]] = {
    # "free" alone is excluded: "two hours free tonight" is about time, not money.
    BudgetLevel.FREE: ("for free", "free activity", "no money", "costs nothing",
                       "spend nothing", "broke", "zero budget", "free of charge"),
    BudgetLevel.LOW: ("cheap", "not much", "inexpensive", "budget", "affordable",
                      "not too expensive", "want to spend", "spend much", "cost much",
                      "low cost", "without spending"),
    BudgetLevel.HIGH: ("splurge", "treat myself", "money is no object", "expensive"),
}

_ENERGY_WORDS: dict[EnergyLevel, tuple[str, ...]] = {
    EnergyLevel.LOW: ("tired", "exhausted", "drained", "low energy", "sleepy", "worn out", "burnt out"),
    EnergyLevel.HIGH: ("energetic", "pumped", "full of energy", "restless", "hyped"),
}

_SOCIAL_WORDS: dict[SocialContext, tuple[str, ...]] = {
    SocialContext.WITH_FRIEND: ("with a friend", "with my friend", "with my mate", "with a mate"),
    SocialContext.GROUP: ("with friends", "with my friends", "group", "with people", "with everyone"),
    SocialContext.FAMILY: ("with my family", "with family", "with my mum", "with my dad", "with my sister", "with my brother"),
    SocialContext.DATE: ("date", "with my partner", "with my girlfriend", "with my boyfriend"),
    SocialContext.SOLO: ("alone", "by myself", "on my own", "solo"),
}

_WHEN_WORDS = ("tonight", "today", "tomorrow", "this weekend", "this afternoon",
               "this evening", "this morning", "next week", "right now")

_DISCOVERY_WORDS = ("what should i", "something to do", "bored", "give me", "suggest",
                    "recommend", "find me", "want to do", "any ideas", "i'm free", "im free",
                    "want to learn", "want to try", "learn something", "try something",
                    "don't know what to do", "dont know what to do", "where should i",
                    "what could i", "something new", "something fun", "want something",
                    "looking for something", "need something")

_CURIOSITY_WORDS = ("i saw", "looked interesting", "curious", "what is", "heard about", "came across")

_REFLECTION_WORDS = ("i tried", "i did", "i finished", "i completed", "it went", "i just got back")


_NUMBER_PATTERN = "|".join(_NUMBER_WORDS)


def _extract_duration(text: str) -> int | None:
    """Reads a duration in minutes from digits or number words."""
    if (hours := re.search(r"(\d+(?:\.\d+)?)\s*(?:hour|hr)s?", text)) is not None:
        return int(float(hours.group(1)) * 60)
    if (minutes := re.search(r"(\d+)\s*(?:minute|min)s?", text)) is not None:
        return int(minutes.group(1))
    if (worded := re.search(rf"\b({_NUMBER_PATTERN})\s*(?:hour|hr)s?", text)) is not None:
        return _NUMBER_WORDS[worded.group(1)] * 60
    if (worded := re.search(rf"\b({_NUMBER_PATTERN})\s*(?:minute|min)s?", text)) is not None:
        return _NUMBER_WORDS[worded.group(1)]
    for phrase, value in _DURATION_WORDS.items():
        if phrase in text:
            return value
    return None


def _match(text: str, table: dict) -> object | None:
    for key, words in table.items():
        if any(word in text for word in words):
            return key
    return None


def extract_context(message: str) -> DiscoveryContext:
    """Pulls constraints out of a message with regex and keyword matching.

    Handles the common shapes ('two hours', 'under $30', 'tired', 'with a friend') and
    reports everything it could not determine through ``missing_fields``.
    """
    text = message.lower().strip()
    if not text:
        return DiscoveryContext(intent=Intent.UNCLEAR, missing_fields=["intent"], confidence=0.0, fallback_used=True)

    duration = _extract_duration(text)

    budget = _match(text, _BUDGET_WORDS)
    if budget is None and (amount := re.search(r"\$\s*(\d+)", text)) is not None:
        spend = int(amount.group(1))
        budget = BudgetLevel.LOW if spend <= 30 else (BudgetLevel.MEDIUM if spend <= 100 else BudgetLevel.HIGH)

    energy = _match(text, _ENERGY_WORDS)
    social = _match(text, _SOCIAL_WORDS)
    when = next((w for w in _WHEN_WORDS if w in text), None)

    if any(word in text for word in _REFLECTION_WORDS):
        intent = Intent.REFLECTION
    elif any(word in text for word in _CURIOSITY_WORDS):
        intent = Intent.CURIOSITY
    elif any(word in text for word in _DISCOVERY_WORDS) or duration or budget or social:
        intent = Intent.ACTIVITY_DISCOVERY
    else:
        intent = Intent.UNCLEAR

    found = {
        "duration_minutes": duration, "budget_level": budget,
        "energy_level": energy, "social_context": social, "when": when,
    }
    missing = [name for name, value in found.items() if value is None]
    # Confidence tracks how much was actually pinned down, not how sure the matcher is.
    confidence = 0.0 if intent is Intent.UNCLEAR else clamp(0.35 + 0.13 * (len(found) - len(missing)))

    return DiscoveryContext(
        intent=intent,
        duration_minutes=duration,
        budget_level=budget,
        energy_level=energy,
        social_context=social,
        when=when,
        activity_preference=[],
        novelty_appetite=None,
        missing_fields=missing,
        confidence=confidence,
        fallback_used=True,
    )


# --------------------------------------------------
# Explanation Generator
# --------------------------------------------------

_DIMENSION_PHRASES = {
    "creative": "creative work",
    "analytical": "problem-solving",
    "hands_on": "making things by hand",
    "physical": "active experiences",
    "social": "doing things with other people",
    "outdoor": "being outdoors",
    "novelty_tolerance": "trying unfamiliar things",
}

_DEFINING_THRESHOLD = 0.6
"""How high an activity attribute must be before the activity counts as being 'about' it."""

_MIN_NOVEL_GAP = 0.15
"""How much higher an activity must score than the user before it counts as introducing something."""

_EXPLORE_NO_NOVEL = ("You enjoy {shared}, and this takes that into something you have not tried "
                     "before. It is a step sideways rather than a leap.")

_TIER_TEMPLATES = {
    Tier.FAMILIAR: "This sits close to what you already enjoy: it leans on {shared}, which your profile shows you respond well to.",
    Tier.EXPLORE: "You enjoy {shared}, and this keeps that while introducing {novel}. It is a step sideways rather than a leap.",
    Tier.WILDCARD: "This one is further from your usual territory, but it connects through {shared} — something the activities you already like have in common.",
}


def generate_explanation(profile: DiscoveryProfile, activity: Activity, tier: Tier) -> str:
    """Builds a 'Why this?' line from the strongest shared dimension.

    Picks the dimension where the user and the activity are both high, and for Explore and
    Wildcard also names what is new, so the explanation stays honest about the stretch.
    """
    attributes = normalise_dimensions(activity.attributes)

    # Only a trait the activity genuinely exercises can honestly be called shared. Without
    # this floor a mostly-physical activity gets sold on "making things by hand" purely
    # because the user happens to score moderately there.
    candidates = [d for d in DIMENSIONS if attributes[d] >= _DEFINING_THRESHOLD] or list(DIMENSIONS)

    shared = max(candidates, key=lambda d: min(profile.dimensions[d], attributes[d]))
    # Exclude the shared trait, or the Explore template reads "keeps X while introducing X".
    novel = max((d for d in DIMENSIONS if d != shared),
                key=lambda d: attributes[d] - profile.dimensions[d])

    overlap = min(profile.dimensions[shared], attributes[shared])
    if overlap < 0.35:
        # Nothing meaningful is shared, so fall back to the activity's own character.
        strongest = max(DIMENSIONS, key=lambda d: attributes[d])
        return (f"A change of pace: {activity.name} is mostly about "
                f"{_DIMENSION_PHRASES[strongest]}, which is territory you have not covered much yet.")

    # Naming a "new" trait the activity barely exercises more than the user does reads as
    # padding, so only claim one when the gap is real.
    if tier is Tier.EXPLORE and attributes[novel] - profile.dimensions[novel] < _MIN_NOVEL_GAP:
        return _EXPLORE_NO_NOVEL.format(shared=_DIMENSION_PHRASES[shared])

    return _TIER_TEMPLATES[tier].format(
        shared=_DIMENSION_PHRASES[shared],
        novel=_DIMENSION_PHRASES[novel],
    )


# --------------------------------------------------
# Reflection Analyser
# --------------------------------------------------

_SURPRISE_WORDS = (
    "didn't expect", "did not expect", "didnt expect", "surprised", "surprising",
    "more than i thought", "more than i expected", "never thought", "unexpectedly",
    "wasn't expecting", "wasnt expecting", "to my surprise",
)


def analyse_reflection(reflection: ReflectionInput, activity: Activity, profile: DiscoveryProfile) -> ReflectionAnalysis:
    """Derives signals from the rating and the activity's own attributes.

    Without a model there is no reading of the free text, so the activity stands in for it:
    enjoying a strongly hands-on activity is evidence about hands_on. Signal strength comes
    from how far the rating sits from neutral.
    """
    attributes = normalise_dimensions(activity.attributes)
    direction = Direction.POSITIVE if reflection.rating >= 4 else Direction.NEGATIVE
    distance = abs(reflection.rating - 3)

    if reflection.rating == 3:
        return ReflectionAnalysis(
            signals=[],
            discovered_summary=f"{activity.name} was neither a hit nor a miss — not enough to change your profile yet.",
            surprised=False,
            fallback_used=True,
        )

    strength = Strength.STRONG if distance >= 2 and reflection.would_repeat == (direction is Direction.POSITIVE) else (
        Strength.MODERATE if distance >= 2 else Strength.WEAK
    )

    # Only dimensions the activity genuinely exercises can be evidence about the user.
    defining = [d for d in DIMENSIONS if attributes[d] >= 0.6 and d != "novelty_tolerance"]
    defining.sort(key=lambda d: attributes[d], reverse=True)

    evidence = f"Rated {reflection.rating}/5 and {'would' if reflection.would_repeat else 'would not'} repeat it."
    signals = [
        PreferenceSignal(direction=direction, strength=strength, evidence=evidence, dimension=dimension)
        for dimension in defining[:3]
    ]

    if direction is Direction.POSITIVE:
        signals.append(PreferenceSignal(
            direction=Direction.POSITIVE,
            strength=Strength.WEAK,
            evidence="Completed and enjoyed an activity outside the usual routine.",
            dimension="novelty_tolerance",
        ))
        for category in activity.categories[:2]:
            signals.append(PreferenceSignal(
                direction=Direction.POSITIVE, strength=Strength.WEAK,
                evidence=evidence, interest=category,
            ))

    predicted = sum(profile.dimensions[d] * attributes[d] for d in DIMENSIONS) / len(DIMENSIONS)
    surprised = (direction is Direction.POSITIVE and predicted < 0.25) or (direction is Direction.NEGATIVE and predicted > 0.4)
    # The fallback cannot read the reflection, but stated surprise is worth catching by
    # keyword: it is what triggers the "something new discovered" moment in the UI.
    if reflection.text and any(phrase in reflection.text.lower() for phrase in _SURPRISE_WORDS):
        surprised = True

    verb = "enjoyed" if direction is Direction.POSITIVE else "did not enjoy"
    summary = f"You {verb} {activity.name}."
    if defining:
        summary += f" That is a signal about {_DIMENSION_PHRASES[defining[0]]}."

    return ReflectionAnalysis(signals=signals, discovered_summary=summary, surprised=surprised, fallback_used=True)


# --------------------------------------------------
# Companion
# --------------------------------------------------

_FOLLOW_UPS = {
    "energy_level": "Are you after something relaxing, or something that gets you moving?",
    "duration_minutes": "Roughly how much time have you got?",
    "social_context": "Is this a solo thing, or are you with someone?",
    "budget_level": "Were you hoping to keep it cheap, or is spending fine?",
}


def companion_reply(message: str, history: list[ChatTurn], profile: DiscoveryProfile,
                    recommendations: list[Activity] | None = None) -> CompanionReply:
    """Produces a serviceable conversational turn without a model.

    Routes on the extracted intent: enough context means go to the engine, too little means
    ask one targeted follow-up rather than guessing.
    """
    context = extract_context(message)

    if recommendations:
        names = ", ".join(activity.name for activity in recommendations[:3])
        return CompanionReply(
            message=f"Here is what I found for you: {names}. Want to turn one of these into a quest?",
            action=CompanionAction.NONE, context=context, fallback_used=True,
        )

    if context.intent is Intent.REFLECTION:
        return CompanionReply(
            message="Nice work finishing that! How did it go?",
            action=CompanionAction.PROMPT_REFLECTION, context=context, fallback_used=True,
        )

    if context.intent is Intent.CURIOSITY:
        return CompanionReply(
            message="That does sound interesting. Want me to find a way for you to try it?",
            action=CompanionAction.REQUEST_RECOMMENDATIONS, context=context, fallback_used=True,
        )

    if context.intent is Intent.UNCLEAR:
        return CompanionReply(
            message="Let's find something! Are you feeling more like relaxing, being creative, "
                    "getting active, or completely surprising yourself?",
            action=CompanionAction.ASK_FOLLOW_UP, context=context,
            follow_up_question="Relaxing, creative, active, or surprise me?", fallback_used=True,
        )

    # Discovery intent: ask once if badly underspecified, otherwise go to the engine.
    blocking = [f for f in ("energy_level", "duration_minutes", "social_context") if f in context.missing_fields]
    if len(blocking) >= 3:
        field_name = blocking[0]
        return CompanionReply(
            message=_FOLLOW_UPS[field_name], action=CompanionAction.ASK_FOLLOW_UP,
            context=context, follow_up_question=_FOLLOW_UPS[field_name], fallback_used=True,
        )

    return CompanionReply(
        message="Got it — let me find something that fits.",
        action=CompanionAction.REQUEST_RECOMMENDATIONS, context=context, fallback_used=True,
    )
