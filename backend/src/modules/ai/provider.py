"""
AI Provider.

The only module in the AI layer that imports an LLM SDK. Swapping Gemini for Bedrock or
Anthropic means rewriting this file and nothing else.

Two rules hold throughout the layer:
  - Every model response is schema-constrained, so no component parses free-form prose.
  - Any failure raises ``ProviderError``, which callers turn into a deterministic fallback
    rather than an error response.
"""

from __future__ import annotations

import json
import logging
from typing import Any, TypeVar

import anyio
from pydantic import BaseModel, ValidationError

from src.config import AIProvider, get_config

_LOGGER = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

_RETRY_BACKOFF_SECONDS = 0.5


class ProviderError(Exception):
    """Raised when the provider cannot produce a usable response."""


class GeminiProvider:
    """Wraps the Google AI Studio client.

    Calls go through the SDK's native async client (``client.aio``) with the SDK's own
    per-request timeout, so nothing blocks the FastAPI event loop.
    """

    def __init__(self, api_key: str, model: str, fast_model: str, timeout_seconds: int, max_retries: int) -> None:
        try:
            from google import genai
        except ImportError as exc:  # pragma: no cover - depends on the install
            raise ProviderError("The 'google-genai' package is not installed") from exc
        self._client = genai.Client(api_key=api_key)
        self._model = model
        self._fast_model = fast_model
        self._timeout_seconds = timeout_seconds
        self._max_retries = max_retries

    def _model_for(self, fast: bool) -> str:
        return self._fast_model if fast else self._model

    async def _call(self, *, model: str, system: str, prompt: str, response_format: dict[str, Any] | None) -> str:
        """Runs a model call, retrying transient failures.

        :raises ProviderError: If every attempt fails or the call exceeds the timeout
        """
        kwargs: dict[str, Any] = {
            "model": model,
            "input": prompt,
            "system_instruction": system,
            "timeout": float(self._timeout_seconds),
        }
        if response_format is not None:
            kwargs["response_format"] = response_format

        last_error: Exception | None = None
        for attempt in range(self._max_retries + 1):
            try:
                interaction = await self._client.aio.interactions.create(**kwargs)
                # output_text is populated by a model validator rather than always present
                text = getattr(interaction, "output_text", None)
                if not text:
                    raise ProviderError(f"Model '{model}' returned an empty response")
                return text
            except Exception as exc:
                last_error = exc
                _LOGGER.warning(f"Model call to '{model}' failed on attempt {attempt + 1}: {exc}")
            if attempt < self._max_retries:
                await anyio.sleep(_RETRY_BACKOFF_SECONDS * (attempt + 1))
        raise ProviderError(f"Model call to '{model}' failed after {self._max_retries + 1} attempts") from last_error

    async def generate_json(self, *, system: str, prompt: str, schema: type[T], fast: bool = False) -> T:
        """Calls the model and validates the reply against a Pydantic schema.

        The schema is passed to the API so the response is guaranteed to be valid JSON in
        the requested shape, which is why no component needs defensive prose parsing.

        :param system: The system instruction describing the model's role
        :param prompt: The user-side input for this call
        :param schema: The Pydantic model the reply must conform to
        :param fast: Whether to use the cheaper model
        :return: A validated instance of ``schema``
        :raises ProviderError: If the call fails or the reply does not validate
        """
        model = self._model_for(fast)
        text = await self._call(
            model=model,
            system=system,
            prompt=prompt,
            response_format={
                "type": "text",
                "mime_type": "application/json",
                "schema": schema.model_json_schema(),
            },
        )
        try:
            return schema.model_validate(json.loads(text))
        except (json.JSONDecodeError, ValidationError) as exc:
            raise ProviderError(f"Model '{model}' returned a response that did not match {schema.__name__}") from exc

    async def generate_text(self, *, system: str, prompt: str, fast: bool = False) -> str:
        """Calls the model for a plain prose reply.

        :raises ProviderError: If the call fails
        """
        text = await self._call(
            model=self._model_for(fast),
            system=system,
            prompt=prompt,
            response_format=None,
        )
        return text.strip()


# --------------------------------------------------
# Singleton access
# --------------------------------------------------

_PROVIDER: GeminiProvider | None = None
_RESOLVED = False


def get_provider() -> GeminiProvider | None:
    """Gets the configured provider, or None when the AI layer should run offline.

    Returning None rather than raising is deliberate: a missing API key, an uninstalled
    SDK or ``provider = "stub"`` are all ordinary states in which the product still works
    through its deterministic fallbacks.
    """
    global _PROVIDER, _RESOLVED
    if _RESOLVED:
        return _PROVIDER
    _RESOLVED = True

    ai_config = getattr(get_config(), "ai", None)
    if ai_config is None:
        _LOGGER.warning("AI config unavailable - has parse_config() run? Falling back to offline mode")
        return None
    if ai_config.provider is AIProvider.STUB:
        _LOGGER.info("AI provider is set to 'stub' - using deterministic fallbacks")
        return None
    if not ai_config.api_key:
        _LOGGER.warning("No AI API key configured - using deterministic fallbacks")
        return None

    try:
        _PROVIDER = GeminiProvider(
            api_key=ai_config.api_key,
            model=ai_config.model,
            fast_model=ai_config.fast_model,
            timeout_seconds=ai_config.timeout_seconds,
            max_retries=ai_config.max_retries,
        )
        _LOGGER.info(f"AI provider ready (model={ai_config.model}, fast_model={ai_config.fast_model})")
    except ProviderError as exc:
        _LOGGER.error(f"Could not initialise the AI provider, using fallbacks instead: {exc}")
        _PROVIDER = None
    return _PROVIDER


def reset_provider() -> None:
    """Clears the cached provider so the next call re-reads configuration. Used by tests."""
    global _PROVIDER, _RESOLVED
    _PROVIDER = None
    _RESOLVED = False
