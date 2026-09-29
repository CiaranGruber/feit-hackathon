"""
Full discovery loop demonstration.

Runs the complete MVP loop end to end against the real catalogue and Discovery Engine:

    Onboard -> Discover -> Ask -> Try -> Reflect -> Learn -> Rediscover

The last three steps are the point. FR12 asks that the change in recommendations before and
after a reflection be clearly visible, and that is what this script is built to show.

Run with `python demo_loop.py` from the backend directory. Works with no API key, in which
case the AI components use their deterministic fallbacks. Set an api_key under [ai] in
config.toml for live model output.
"""

import asyncio
from pathlib import Path

from src import DEFAULT_CONFIG_FILE
from src.config import parse_config
from src.modules.ai import (
    BudgetLevel,
    DIMENSIONS,
    Direction,
    QuestionnaireResponse,
    ReflectionInput,
    SIGNAL_WEIGHTS,
    analyse_reflection,
    companion_reply,
    generate_profile,
    get_provider,
    nudge,
)
from src.modules.catalogue import get_activity, load_activities
from src.modules.discovery import DiscoveryHistory, explain, recommend

RULE = "=" * 78


def heading(text: str) -> None:
    print(f"\n{RULE}\n{text}\n{RULE}")


def show_profile(dimensions, compared_to=None) -> None:
    for name in DIMENSIONS:
        value = dimensions[name]
        delta = ""
        if compared_to is not None:
            change = value - compared_to[name]
            if abs(change) >= 0.005:
                delta = f"   {change:+.2f}"
        print(f"  {name:>18}  {value:.2f}  {'#' * round(value * 28):<28}{delta}")


def show_recommendations(recommendations, show_why: bool = True) -> None:
    for r in recommendations:
        a = r.activity
        print(f"\n  [{r.tier.value.upper()}]  {a.name}")
        print(f"      {a.description}")
        print(f"      {a.duration_min}-{a.duration_max} min | {a.cost_level.value} | "
              f"difficulty {a.difficulty}/5 | {', '.join(a.categories)}")
        if show_why and r.explanation:
            print(f"      Why this? {r.explanation}")
        b = r.breakdown
        print(f"      score {b.total:.3f}  (fit {b.preference_fit:.2f} | context {b.context_fit:.2f} | "
              f"novelty {b.novelty:.2f} | connection {b.connection:.2f})")


def apply_signals(dimensions, signals):
    """Applies preference signals to a profile.

    This belongs in the profile-update module, which is not built yet. It is reproduced here
    so the loop closes and the before/after change is visible. ``nudge`` is used rather than
    plain addition so repeated evidence cannot saturate a dimension.
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
        print(f"Could not load {config_file} ({exc}). Copy config.toml.example to config.toml first.")
        return

    catalogue = load_activities()
    mode = "LIVE MODEL" if get_provider() is not None else "FALLBACK (no API key configured)"
    print(f"\nDiscovery loop demo - {len(catalogue)} activities in catalogue - AI running in {mode} mode")

    # ------------------------------------------------------------------ onboard
    heading("STAGE 1-2.  ONBOARDING -> DISCOVERY PROFILE")
    questionnaire = QuestionnaireResponse(
        interests=["photography", "drawing", "coffee"],
        activity_types=["creative", "relaxed"],
        indoor_outdoor=3, solo_social=2, active_relaxed=2, creative_analytical=2,
        time_availability_minutes=120, budget=BudgetLevel.MEDIUM, novelty=3,
    )
    print(f"Interests: {', '.join(questionnaire.interests)}")
    print(f"Sliders: indoor/outdoor {questionnaire.indoor_outdoor}, solo/social {questionnaire.solo_social}, "
          f"relaxed/active {questionnaire.active_relaxed}, creative/analytical {questionnaire.creative_analytical}, "
          f"novelty {questionnaire.novelty}\n")

    profile = await generate_profile(questionnaire)
    show_profile(profile.dimensions)
    print(f"\n  {profile.summary}")
    print(f"  Has not explored much: {', '.join(profile.underexplored) or '(none)'}")

    # ------------------------------------------------------------------ discover
    heading("STAGE 3.  FIRST RECOMMENDATIONS  (FR3, FR4)")
    initial = await explain(profile, recommend(profile))
    show_recommendations(initial)

    # ------------------------------------------------------------------ ask
    heading("STAGE 4.  ASKING THE COMPANION  (FR5, FR6)")
    message = "I have two hours free tonight but I'm tired and don't want to spend much."
    print(f'User: "{message}"\n')

    reply = await companion_reply(message, [], profile)
    print(f'Companion: "{reply.message}"')
    context = reply.context
    print(f"\nExtracted context: intent={context.intent.value}, duration={context.duration_minutes}min, "
          f"budget={context.budget_level}, energy={context.energy_level}, when={context.when}")
    print("The same engine now runs with that context layered over the stored profile:")
    show_recommendations(await explain(profile, recommend(profile, context=context), context), show_why=False)

    # ------------------------------------------------------------------ try + reflect
    heading("STAGE 5-6.  COMPLETE A QUEST AND REFLECT  (FR7, FR8, FR9)")
    quest = get_activity("beginner-pottery")
    reflection = ReflectionInput(
        rating=5, would_repeat=True, perceived_difficulty=3,
        text="I didn't expect to enjoy this that much. I really liked making something with my hands, "
             "much more than just looking at art in a gallery.",
    )
    print(f"Quest completed: {quest.name}")
    print(f"Rating {reflection.rating}/5, would repeat, difficulty just right")
    print(f'Reflection: "{reflection.text}"')

    # ------------------------------------------------------------------ learn
    heading("STAGE 7.  AI ANALYSES THE EXPERIENCE  (FR10)")
    analysis = await analyse_reflection(reflection, quest, profile)
    for signal in analysis.signals:
        subject = signal.dimension or f"interest: {signal.interest}"
        arrow = "UP  " if signal.direction is Direction.POSITIVE else "DOWN"
        print(f"  {arrow} {subject:<26} {signal.strength.value:<9} {signal.evidence[:40]}")
    print(f"\n  {analysis.discovered_summary}")
    print(f"  Surprised by the outcome: {analysis.surprised}")

    heading("STAGE 8.  PROFILE UPDATE  (FR11)")
    updated_dimensions = apply_signals(profile.dimensions, analysis.signals)
    show_profile(updated_dimensions, compared_to=profile.dimensions)
    moved = [d for d in DIMENSIONS if abs(updated_dimensions[d] - profile.dimensions[d]) >= 0.005]
    print(f"\n  Moved: {', '.join(moved) if moved else '(nothing)'}")

    from dataclasses import replace as dc_replace
    new_interests = [s.interest for s in analysis.signals
                     if s.interest and s.direction is Direction.POSITIVE]
    grown = dc_replace(
        profile,
        dimensions=updated_dimensions,
        emerging_interests=sorted(set(new_interests))[:4],
    )
    if grown.emerging_interests:
        print(f"  Emerging interests: {', '.join(grown.emerging_interests)}")

    # ------------------------------------------------------------------ rediscover
    heading("STAGE 9.  REDISCOVERY - THE SAME ENGINE, THE CHANGED PROFILE  (FR12)")
    history = DiscoveryHistory(
        completed_ids=frozenset({quest.id}),
        recently_shown_ids=frozenset({r.activity.id for r in initial}),
        completed_categories={c: 1 for c in quest.categories},
    )
    rediscovered = await explain(grown, recommend(grown, history=history))

    print("\nBEFORE the pottery experience:")
    for r in initial:
        print(f"  {r.tier.value:8s} {r.activity.name}")
    print("\nAFTER the pottery experience:")
    for r in rediscovered:
        print(f"  {r.tier.value:8s} {r.activity.name}")

    before_ids = {r.activity.id for r in initial}
    after_ids = {r.activity.id for r in rediscovered}
    print(f"\n  {len(after_ids - before_ids)} of 3 recommendations changed.")

    categories = {c for r in rediscovered for c in r.activity.categories}
    print(f"  Categories now on offer: {', '.join(sorted(categories))}")
    print("  Note these are not all craft activities. FR11 requires a discovered interest to")
    print("  widen the discovery space rather than replace one narrow bubble with another.\n")

    show_recommendations(rediscovered)
    print(f"\n{RULE}\nLoop complete.\n{RULE}\n")


if __name__ == "__main__":
    asyncio.run(main())
