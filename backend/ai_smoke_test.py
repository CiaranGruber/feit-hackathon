"""
AI Layer smoke test.

Runs the complete discovery loop end to end and prints what each component produced:

    onboard -> discover -> ask -> reflect -> learn

Run it with `python ai_smoke_test.py` from the backend directory. It works with no API key
configured, in which case every component uses its deterministic fallback and says so. Set
an api_key under [ai] in config.toml to see the live model path instead.

This is a demonstration harness rather than a unit test suite: it exercises the layer and
shows its output, which is also the quickest way to sanity-check prompt changes.
"""

import asyncio
from pathlib import Path

from src import DEFAULT_CONFIG_FILE
from src.config import parse_config
from src.modules.ai import (
    Activity,
    BudgetLevel,
    ChatTurn,
    DIMENSIONS,
    Direction,
    QuestionnaireResponse,
    ReflectionInput,
    SIGNAL_WEIGHTS,
    Tier,
    analyse_reflection,
    companion_reply,
    extract_context,
    generate_explanation,
    generate_profile,
    fallback_reason,
    get_provider,
    nudge,
)

# A few catalogue-shaped fixtures. The real catalogue is built elsewhere; these exist only
# so the layer has something to reason about.
ACTIVITIES = [
    Activity(
        id="photo-walk", name="Urban Photo Walk",
        description="Walk a nearby neighbourhood for 30 minutes and photograph five details you would normally overlook.",
        categories=["creative", "outdoor"],
        attributes={"creative": 0.85, "analytical": 0.3, "hands_on": 0.2, "physical": 0.35, "social": 0.1, "outdoor": 0.8, "novelty_tolerance": 0.3},
        duration_min=30, duration_max=60, cost_level=BudgetLevel.FREE, difficulty=1,
        related_interests=["photography", "walking"],
    ),
    Activity(
        id="pottery", name="Beginner Pottery Session",
        description="Try a beginner pottery class and make one simple object from clay.",
        categories=["creative", "craft"],
        attributes={"creative": 0.8, "analytical": 0.2, "hands_on": 0.95, "physical": 0.3, "social": 0.5, "outdoor": 0.05, "novelty_tolerance": 0.6},
        duration_min=60, duration_max=120, cost_level=BudgetLevel.MEDIUM, difficulty=2,
        related_interests=["drawing", "sculpture", "craft"],
    ),
    Activity(
        id="bouldering", name="Indoor Bouldering Taster",
        description="Try a beginner bouldering session at an indoor climbing gym.",
        categories=["physical", "games"],
        attributes={"creative": 0.15, "analytical": 0.6, "hands_on": 0.5, "physical": 0.95, "social": 0.4, "outdoor": 0.1, "novelty_tolerance": 0.8},
        duration_min=60, duration_max=120, cost_level=BudgetLevel.MEDIUM, difficulty=3,
        related_interests=["climbing", "fitness"],
    ),
]

RULE = "=" * 78


def heading(text: str) -> None:
    print(f"\n{RULE}\n{text}\n{RULE}")


def show_dimensions(dimensions: dict[str, float], compared_to: dict[str, float] | None = None) -> None:
    for name in DIMENSIONS:
        value = dimensions[name]
        bar = "#" * round(value * 30)
        delta = ""
        if compared_to is not None:
            change = value - compared_to[name]
            if abs(change) >= 0.005:
                delta = f"  ({change:+.2f})"
        print(f"  {name:>18}  {value:.2f}  {bar:<30}{delta}")


def apply_signals(dimensions: dict[str, float], signals) -> dict[str, float]:
    """Applies signals using the suggested weights.

    The profile-update logic owns this for real; it is reproduced here only to show that the
    signals this layer emits are directly usable, and to make the before/after visible.
    """
    updated = dict(dimensions)
    for signal in signals:
        if signal.dimension is None:
            continue
        step = SIGNAL_WEIGHTS[signal.strength]
        if signal.direction is Direction.NEGATIVE:
            step = -step
        updated[signal.dimension] = nudge(updated[signal.dimension], step)
    return updated


async def main() -> None:
    config_file = DEFAULT_CONFIG_FILE if Path(DEFAULT_CONFIG_FILE).is_file() else Path("config.toml")
    try:
        parse_config(config_file)
    except (KeyError, ValueError) as exc:
        print(f"Could not load {config_file} ({exc}).")
        print("Copy config.toml.example to config.toml and set api_key to run this.")
        return

    reason = fallback_reason()
    mode = "LIVE MODEL" if reason is None else f"FALLBACK ({reason})"
    print(f"\nAI layer smoke test - running in {mode} mode")

    # ---------------------------------------------------------------- onboard
    heading("1. ONBOARDING -> DISCOVERY PROFILE  (FR1, FR2)")
    questionnaire = QuestionnaireResponse(
        interests=["photography", "drawing", "coffee"],
        activity_types=["creative", "relaxed"],
        indoor_outdoor=3, solo_social=2, active_relaxed=2, creative_analytical=2,
        time_availability_minutes=120, budget=BudgetLevel.LOW, novelty=3,
    )
    print(f"Answers: interests={questionnaire.interests}, sliders "
          f"(in/out={questionnaire.indoor_outdoor}, solo/social={questionnaire.solo_social}, "
          f"relax/active={questionnaire.active_relaxed}, creative/analytical={questionnaire.creative_analytical}, "
          f"novelty={questionnaire.novelty})\n")

    profile = await generate_profile(questionnaire)
    show_dimensions(profile.dimensions)
    print(f"\n  Summary:      {profile.summary}")
    print(f"  Interests:    {', '.join(profile.stated_interests)}")
    print(f"  Underexplored:{' ' + ', '.join(profile.underexplored) if profile.underexplored else ' (none)'}")
    print(f"  [fallback_used={profile.fallback_used}]")

    # ---------------------------------------------------------------- discover
    heading("2. RECOMMENDATIONS + \"WHY THIS?\"  (FR3, FR4)")
    for activity, tier in zip(ACTIVITIES, (Tier.FAMILIAR, Tier.EXPLORE, Tier.WILDCARD)):
        explanation = await generate_explanation(profile, activity, tier)
        print(f"\n  [{tier.value.upper()}] {activity.name}")
        print(f"     Why this? {explanation}")

    # ---------------------------------------------------------------- ask
    heading("3. COMPANION + CONTEXT EXTRACTION  (FR5, FR6)")
    message = "I have two hours free tonight but I'm tired and don't want to spend much."
    print(f'  User: "{message}"\n')

    context = await extract_context(message, profile)
    print(f"  Extracted -> intent={context.intent.value}, duration={context.duration_minutes}min, "
          f"budget={context.budget_level}, energy={context.energy_level}, when={context.when}")
    print(f"               confidence={context.confidence:.2f}, missing={context.missing_fields}")
    print(f"               [fallback_used={context.fallback_used}]")

    reply = await companion_reply(message, [], profile)
    print(f'\n  Companion: "{reply.message}"')
    print(f"  Action: {reply.action.value}")

    vague = "I'm bored. Give me something to do."
    vague_reply = await companion_reply(vague, [ChatTurn(role="user", content=message)], profile)
    print(f'\n  User: "{vague}"')
    print(f'  Companion: "{vague_reply.message}"')
    print(f"  Action: {vague_reply.action.value}")

    # ---------------------------------------------------------------- reflect
    heading("4. REFLECTION -> PREFERENCE SIGNALS  (FR9, FR10)")
    pottery = ACTIVITIES[1]
    reflection = ReflectionInput(
        rating=5, would_repeat=True, perceived_difficulty=3,
        text="I didn't expect to enjoy this that much. I really liked making something with my hands.",
    )
    print(f"  Completed: {pottery.name}")
    print(f'  Rating {reflection.rating}/5, would repeat. Wrote: "{reflection.text}"\n')

    analysis = await analyse_reflection(reflection, pottery, profile)
    for signal in analysis.signals:
        subject = signal.dimension or f"interest:{signal.interest}"
        arrow = "UP  " if signal.direction is Direction.POSITIVE else "DOWN"
        print(f"    {arrow} {subject:<28} {signal.strength.value:<9} {signal.evidence[:44]}")
    print(f"\n  Summary:   {analysis.discovered_summary}")
    print(f"  Surprised: {analysis.surprised}")
    print(f"  [fallback_used={analysis.fallback_used}]")

    # ---------------------------------------------------------------- learn
    heading("5. PROFILE UPDATE -> REDISCOVERY  (FR11, FR12)")
    print("Applying the emitted signals with the suggested weights.")
    print("(The profile-update logic owns this for real; shown here to prove the signals are usable.)\n")
    updated = apply_signals(profile.dimensions, analysis.signals)
    show_dimensions(updated, compared_to=profile.dimensions)

    changed = [d for d in DIMENSIONS if abs(updated[d] - profile.dimensions[d]) >= 0.005]
    print(f"\n  Dimensions moved: {', '.join(changed) if changed else '(none)'}")
    print("  This movement is what makes the FR12 before/after recommendation change visible.")
    print(f"\n{RULE}\nLoop complete.\n{RULE}\n")


if __name__ == "__main__":
    asyncio.run(main())
