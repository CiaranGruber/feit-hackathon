"""
Full discovery loop demonstration, running entirely on the SQLite database.

Runs the complete MVP loop end to end:

    Onboard -> Discover -> Ask -> Try -> Reflect -> Learn -> Rediscover

Everything persists. The profile is written to USER_PROFILES, the quest completion and
reflection to USER_TASK_COMPLETIONS, and the extracted signals to PROFILE_SIGNALS. Between
stages the profile is re-read from the database rather than held in memory, so the final
rediscovery genuinely reflects stored state.

The last three stages are the point. FR12 asks that the change in recommendations before and
after a reflection be clearly visible, and that is what this script is built to show.

Run with `python demo_loop.py` from the backend directory, after `python scripts/setup_db.py`.
Works with no API key, in which case the AI components use their deterministic fallbacks.
"""

import asyncio
from pathlib import Path

from sqlalchemy import delete
from sqlalchemy.orm import Session

from src import DEFAULT_CONFIG_FILE
from src.app import app, init_app
from src.config import get_config, parse_config
from src.modules.ai import (
    DIMENSIONS,
    BudgetLevel,
    Direction,
    QuestionnaireResponse,
    ReflectionInput,
    analyse_reflection,
    companion_reply,
    fallback_reason,
    generate_profile,
)
from src.modules.catalogue import CatalogueError, find_activity, load_activities
from src.modules.db_schema import ProfileSignal, UserProfile, UserTaskCompletion
from src.modules.discovery import explain, recommend
from src.modules.profiles import (
    apply_signals,
    get_history,
    get_profile_version,
    get_signals,
    load_profile,
    record_signals,
    save_profile,
)
from src.modules.tasks import complete_task

# Alice, from scripts/seed.sql.
DEMO_USER = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
QUEST_NAME = "Beginner pottery session"

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


def reset_demo_user() -> None:
    """Clears this user's stored state so the demo can be run repeatedly.

    Only touches the demo user's own rows. Tasks and tags are untouched.
    """
    with Session(app().db_engine) as session:
        session.execute(delete(UserTaskCompletion).where(UserTaskCompletion.user_id == DEMO_USER))
        session.execute(delete(ProfileSignal).where(ProfileSignal.user_id == DEMO_USER))
        session.execute(delete(UserProfile).where(UserProfile.user_id == DEMO_USER))
        session.commit()


async def main() -> None:
    config_file = DEFAULT_CONFIG_FILE if Path(DEFAULT_CONFIG_FILE).is_file() else Path("../config.toml")
    try:
        parse_config(config_file)
    except (KeyError, ValueError) as exc:
        print(f"Could not load {config_file} ({exc}). Copy config.toml.example to config.toml first.")
        return

    init_app(get_config())
    try:
        catalogue = load_activities()
    except CatalogueError as exc:
        print(f"Could not read the catalogue: {exc}")
        return

    reason = fallback_reason()
    mode = "LIVE MODEL" if reason is None else f"FALLBACK ({reason})"
    print(f"\nDiscovery loop demo - {len(catalogue)} tasks from SQLite - AI running in {mode} mode")
    reset_demo_user()
    print("Demo user state cleared, so this is repeatable.")

    # ------------------------------------------------------------------ onboard
    heading("STAGE 1-2.  ONBOARDING -> PROFILE, WRITTEN TO USER_PROFILES")
    questionnaire = QuestionnaireResponse(
        interests=["photography", "drawing", "coffee"],
        activity_types=["creative", "relaxed"],
        indoor_outdoor=3, solo_social=2, active_relaxed=2, creative_analytical=2,
        time_availability_minutes=120, budget=BudgetLevel.MEDIUM, novelty=3,
    )
    print(f"Interests: {', '.join(questionnaire.interests)}")
    print(f"Sliders: indoor/outdoor {questionnaire.indoor_outdoor}, solo/social {questionnaire.solo_social}, "
          f"relaxed/active {questionnaire.active_relaxed}, creative/analytical {questionnaire.creative_analytical}, "
          f"novelty {questionnaire.novelty}")

    generated = await generate_profile(questionnaire)
    version = save_profile(DEMO_USER, generated)
    print(f"\nSaved to USER_PROFILES at version {version}. Reading it back:\n")

    profile = load_profile(DEMO_USER)
    show_profile(profile.dimensions)
    print(f"\n  {profile.summary}")
    print(f"  Has not explored much: {', '.join(profile.underexplored) or '(none)'}")

    # ------------------------------------------------------------------ discover
    heading("STAGE 3.  FIRST RECOMMENDATIONS  (FR3, FR4)")
    history = get_history(DEMO_USER)
    print(f"History from USER_TASK_COMPLETIONS: {len(history.completed_ids)} completed, "
          f"{len(history.disliked_ids)} disliked")
    initial = await explain(profile, recommend(profile, history=history))
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
    show_recommendations(recommend(profile, context=context, history=history), show_why=False)

    # ------------------------------------------------------------------ try
    heading("STAGE 5-6.  COMPLETE A QUEST, WRITTEN TO USER_TASK_COMPLETIONS  (FR7-FR9)")
    quest = find_activity(QUEST_NAME)
    reflection = ReflectionInput(
        rating=5, would_repeat=True, perceived_difficulty=3,
        text="I didn't expect to enjoy this that much. I really liked making something with my "
             "hands, much more than just looking at art in a gallery.",
    )
    complete_task(
        user_id=DEMO_USER,
        task_id=quest.id,
        comment=reflection.text,
        activity_rating=reflection.rating,
        would_repeat=reflection.would_repeat,
        perceived_difficulty=reflection.perceived_difficulty,
    )
    print(f"Quest completed: {quest.name}")
    print(f"Rating {reflection.rating}/5, would repeat, difficulty just right")
    print(f'Reflection: "{reflection.text}"')
    print("\nWritten to USER_TASK_COMPLETIONS.")

    # ------------------------------------------------------------------ learn
    heading("STAGE 7.  AI ANALYSES IT, SIGNALS WRITTEN TO PROFILE_SIGNALS  (FR10)")
    analysis = await analyse_reflection(reflection, quest, profile)
    record_signals(DEMO_USER, analysis.signals, task_id=quest.id, applied=True)
    print(f"Stored {len(analysis.signals)} signal(s). Reading them back from the database:\n")
    for signal in get_signals(DEMO_USER):
        subject = signal.dimension or f"interest: {signal.interest}"
        arrow = "UP  " if signal.direction is Direction.POSITIVE else "DOWN"
        print(f"  {arrow} {subject:<26} {signal.strength.value:<9} {signal.evidence[:40]}")
    print(f"\n  {analysis.discovered_summary}")
    print(f"  Surprised by the outcome: {analysis.surprised}")

    heading("STAGE 8.  PROFILE UPDATE  (FR11)")
    grown = apply_signals(profile, analysis.signals)
    new_version = save_profile(DEMO_USER, grown)
    grown = load_profile(DEMO_USER)
    print(f"Profile version {version} -> {new_version}, re-read from the database:\n")
    show_profile(grown.dimensions, compared_to=profile.dimensions)
    moved = [d for d in DIMENSIONS if abs(grown.dimensions[d] - profile.dimensions[d]) >= 0.005]
    print(f"\n  Moved: {', '.join(moved) if moved else '(nothing)'}")
    if grown.emerging_interests:
        print(f"  Emerging interests: {', '.join(grown.emerging_interests)}")
    print(f"  Still unexplored: {', '.join(grown.underexplored) or '(none)'}")

    # ------------------------------------------------------------------ rediscover
    heading("STAGE 9.  REDISCOVERY - SAME ENGINE, STORED PROFILE, STORED HISTORY  (FR12)")
    grown_history = get_history(DEMO_USER, recently_shown_ids=frozenset(r.activity.id for r in initial))
    print(f"History now reads {len(grown_history.completed_ids)} completed task(s) from the database, "
          f"across categories {sorted(grown_history.completed_categories)}")
    rediscovered = await explain(grown, recommend(grown, history=grown_history))

    print("\nBEFORE the pottery experience:")
    for r in initial:
        print(f"  {r.tier.value:8s} {r.activity.name}")
    print("\nAFTER the pottery experience:")
    for r in rediscovered:
        print(f"  {r.tier.value:8s} {r.activity.name}")

    before_ids = {r.activity.id for r in initial}
    after_ids = {r.activity.id for r in rediscovered}
    print(f"\n  {len(after_ids - before_ids)} of {len(rediscovered)} recommendations changed.")
    categories = {c for r in rediscovered for c in r.activity.categories}
    print(f"  Dimensions now on offer: {', '.join(sorted(categories))}")
    print("  Note these are not all hands-on activities. FR11 requires a discovered interest")
    print("  to widen the discovery space rather than replace one narrow bubble with another.\n")

    show_recommendations(rediscovered)

    print(f"\n{RULE}")
    print(f"Loop complete. Stored state for this user: profile version "
          f"{get_profile_version(DEMO_USER)}, {len(get_signals(DEMO_USER))} signals, "
          f"{len(get_history(DEMO_USER).completed_ids)} completion(s).")
    print(f"{RULE}\n")


if __name__ == "__main__":
    asyncio.run(main())
