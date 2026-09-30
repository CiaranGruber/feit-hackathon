"""
AI Layer.

The five AI components behind the discovery loop, per section 4 of the product document:

    Profile Generator      questionnaire      -> Discovery Profile
    Context Extractor      companion message  -> temporary constraints
    Explanation Generator  profile + activity -> "Why this?"
    Reflection Analyser    rating + text      -> preference signals
    Companion              chat turn          -> reply + intent + action

Three properties hold across all of them:

  - Stateless. Nothing here touches the database, the app singleton or the request context.
    Callers load data, pass it in, and persist what comes back.
  - Non-raising. Every function degrades to a deterministic implementation rather than
    failing, so a rate limit or a dropped connection cannot break the product. Degraded
    results carry ``fallback_used = True``.
  - Structured. The AI reasons and interprets; the types in ``types.py`` provide the
    consistency and control. This is the technical principle from section 13.

Import from this module rather than reaching into submodules.
"""

from src.modules.ai.companion import companion_reply
from src.modules.ai.context_extractor import extract_context
from src.modules.ai.explanation_generator import generate_explanation
from src.modules.ai.profile_generator import generate_profile
from src.modules.ai.provider import ProviderError, fallback_reason, get_provider, reset_provider
from src.modules.ai.reflection_analyser import analyse_reflection
from src.modules.ai.types import (
    DIMENSIONS,
    SIGNAL_WEIGHTS,
    Activity,
    BudgetLevel,
    ChatTurn,
    CompanionAction,
    CompanionReply,
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

__all__ = [
    # Components
    "generate_profile",
    "extract_context",
    "generate_explanation",
    "analyse_reflection",
    "companion_reply",
    # Vocabulary
    "DIMENSIONS",
    "SIGNAL_WEIGHTS",
    "normalise_dimensions",
    "empty_dimensions",
    "nudge",
    "clamp",
    # Types
    "Activity",
    "BudgetLevel",
    "ChatTurn",
    "CompanionAction",
    "CompanionReply",
    "Direction",
    "DiscoveryContext",
    "DiscoveryProfile",
    "EnergyLevel",
    "Intent",
    "PreferenceSignal",
    "QuestionnaireResponse",
    "ReflectionAnalysis",
    "ReflectionInput",
    "SocialContext",
    "Strength",
    "Tier",
    # Provider
    "ProviderError",
    "get_provider",
    "fallback_reason",
    "reset_provider",
]
