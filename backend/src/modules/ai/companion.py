"""
AI Companion.

The conversational entry point to the Discovery Engine (FR5).

Per section 7 of the product document the companion is an interface to the same engine, not
a second brain. It never invents activities: when it decides the user wants suggestions it
returns REQUEST_RECOMMENDATIONS and the caller runs the Discovery Engine, then calls back
with the results so the companion can present them in its own voice.

    message -> extract context -> decide action -> (caller runs engine) -> conversational reply
"""

from __future__ import annotations

import logging
from typing import Literal

from pydantic import BaseModel, Field

from src.modules.ai import fallbacks
from src.modules.ai.context_extractor import extract_context
from src.modules.ai.provider import ProviderError, get_provider
from src.modules.ai.types import (
    Activity,
    ChatTurn,
    CompanionAction,
    CompanionReply,
    DiscoveryContext,
    DiscoveryProfile,
    Intent,
)

_LOGGER = logging.getLogger(__name__)

_HISTORY_TURNS = 6
"""How much conversation to replay. The layer is stateless, so callers own the transcript."""

_SYSTEM = """You are a friendly companion pet in a personal-discovery app. You help people find \
activities and experiences worth trying, especially ones they would not have thought to look for.

Your personality: warm, curious, encouraging, brief. An enthusiastic exploration partner, not an \
authoritative assistant. Never sycophantic and never more excited than the user is.

Hard rules:
1. NEVER invent or name specific activities yourself. You do not have the catalogue. When the \
user wants suggestions, set action to request_recommendations and say something brief that \
signals you are looking - the real activities arrive separately.
2. When activities ARE provided to you, present them naturally in your own voice. Mention why \
they might suit this person. Do not list them mechanically.
3. Ask at most ONE follow-up question per reply, and only when the answer would genuinely change \
what gets recommended. Do not interrogate. "I'm bored" deserves one friendly question, not a form.
4. Keep replies to 1-3 sentences. This is chat, not an essay.
5. No markdown, no bullet points, no emoji spam. At most one emoji, and usually none.

Actions:
- request_recommendations: they want something to do and you have enough to go on
- ask_follow_up: you need one key detail first (put the question in follow_up_question)
- prompt_reflection: they mentioned finishing something, so invite them to reflect on it
- start_quest: they want to commit to an activity already discussed
- none: ordinary conversation, or you are presenting activities you were given"""


class _CompanionSchema(BaseModel):
    message: str
    action: Literal["none", "request_recommendations", "ask_follow_up", "start_quest", "prompt_reflection"]
    follow_up_question: str = Field(description="Empty string unless action is ask_follow_up")


def _format_history(history: list[ChatTurn]) -> str:
    if not history:
        return "(this is the first message)"
    recent = history[-_HISTORY_TURNS:]
    return "\n".join(f"{'User' if turn.role == 'user' else 'You'}: {turn.content}" for turn in recent)


def _prompt(
    message: str,
    history: list[ChatTurn],
    profile: DiscoveryProfile,
    context: DiscoveryContext,
    recommendations: list[Activity] | None,
) -> str:
    sections = [
        f"About this user: {profile.summary or 'no profile summary yet'}",
        f"They already enjoy: {', '.join(profile.stated_interests) or '(nothing recorded yet)'}",
    ]
    if profile.emerging_interests:
        sections.append(f"They recently discovered they enjoy: {', '.join(profile.emerging_interests)}")

    sections += [f"\nConversation so far:\n{_format_history(history)}", f"\nTheir new message: \"{message.strip()}\""]

    known = [
        f"{label}: {value}" for label, value in (
            ("time available", f"{context.duration_minutes} minutes" if context.duration_minutes else None),
            ("budget", context.budget_level.value if context.budget_level else None),
            ("energy", context.energy_level.value if context.energy_level else None),
            ("who they are with", context.social_context.value if context.social_context else None),
            ("when", context.when),
        ) if value
    ]
    sections.append(
        f"\nWhat you understood from this message (intent: {context.intent.value}):\n"
        + ("\n".join(f"  {item}" for item in known) if known else "  nothing specific stated")
    )
    if context.missing_fields:
        sections.append(
            f"Still unknown: {', '.join(context.missing_fields)}. "
            "Ask about at most one of these, and only if it would change the recommendation."
        )

    if recommendations:
        sections.append("\nActivities found for them - present these in your own voice:")
        for activity in recommendations[:3]:
            sections.append(
                f"  - {activity.name}: {activity.description} "
                f"({activity.duration_min}-{activity.duration_max} min, {activity.cost_level.value} cost)"
            )
        sections.append("Set action to none, since you are presenting results rather than asking for more.")

    sections.append("\nWrite your reply.")
    return "\n".join(sections)


async def companion_reply(
    message: str,
    history: list[ChatTurn] | None = None,
    profile: DiscoveryProfile | None = None,
    recommendations: list[Activity] | None = None,
) -> CompanionReply:
    """Produces one conversational turn.

    :param message: What the user just said
    :param history: Prior turns; the layer holds no state, so callers pass the transcript
    :param profile: The user's profile, used for tone and relevance
    :param recommendations: Activities from the Discovery Engine. When supplied, the companion
        presents these instead of asking for more information.
    :return: The reply, the context extracted from this turn, and what the caller should do
        next. Never raises.
    """
    history = history or []
    if not message or not message.strip():
        return CompanionReply(
            message="I'm here whenever you want to find something to do.",
            action=CompanionAction.NONE,
        )

    # Extraction runs first so the reply is grounded in the same context the engine will use.
    context = await extract_context(message, profile)

    provider = get_provider()
    if provider is None or profile is None:
        reply = fallbacks.companion_reply(message, history, profile, recommendations)
        return CompanionReply(
            message=reply.message,
            action=reply.action,
            context=context,
            follow_up_question=reply.follow_up_question,
            fallback_used=True,
        )

    try:
        result = await provider.generate_json(
            schema=_CompanionSchema,
            system=_SYSTEM,
            prompt=_prompt(message, history, profile, context, recommendations),
            fast=True,
        )
    except ProviderError as exc:
        _LOGGER.warning(f"Companion reply fell back to the deterministic implementation: {exc}")
        reply = fallbacks.companion_reply(message, history, profile, recommendations)
        return CompanionReply(
            message=reply.message, action=reply.action, context=context,
            follow_up_question=reply.follow_up_question, fallback_used=True,
        )

    action = CompanionAction(result.action)
    # A reflection intent should always reach the reflection flow, even if the model missed it.
    if context.intent is Intent.REFLECTION and action is CompanionAction.NONE:
        action = CompanionAction.PROMPT_REFLECTION

    return CompanionReply(
        message=result.message.strip(),
        action=action,
        context=context,
        follow_up_question=result.follow_up_question.strip() or None if action is CompanionAction.ASK_FOLLOW_UP else None,
        fallback_used=False,
    )
