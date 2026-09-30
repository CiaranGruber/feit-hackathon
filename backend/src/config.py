"""
No Idea Config management

All configuration items loaded into the backend get automatically validated and checked here
"""

from __future__ import annotations

import copy
import logging
import tomllib
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Callable, TypeVar, Union

LOGGER_FORMAT = "%(levelname)s:%(name)s - %(message)s"
logging.basicConfig(
    format=LOGGER_FORMAT,
    level=logging.INFO,
)
_LOGGER = logging.getLogger("config")

# --------------------------------------------------
# Schema
# --------------------------------------------------

@dataclass(frozen=True)
class LoggingConfig:
    file: Path | None
    level: str


@dataclass(frozen=True)
class SQLite3Config:
    path: Path


@dataclass(frozen=True)
class PostgresConfig:
    host: str
    port: int
    db_name: str
    user: str
    password: str


@dataclass(frozen=True)
class DatabaseConfig:
    type: DBType
    sqlite3: SQLite3Config | None = None
    postgres: PostgresConfig | None = None


@dataclass(frozen=True)
class AIConfig:
    provider: AIProvider
    api_key: str | None
    model: str
    fast_model: str
    timeout_seconds: int
    max_retries: int

    @property
    def enabled(self) -> bool:
        """Whether live model calls are possible.

        A missing API key is not an error: the AI layer transparently falls back to its
        deterministic implementations, so the product still runs end to end.
        """
        return self.provider is AIProvider.GEMINI and bool(self.api_key)


def _default_ai_config() -> AIConfig:
    """A stubbed AI config, used when a Config is built without one.

    Defaults to the 'stub' provider so code constructing Config directly - tests in
    particular - can never accidentally reach a live model or consume API quota.
    """
    return AIConfig(
        provider=AIProvider.STUB,
        api_key=None,
        model="",
        fast_model="",
        timeout_seconds=20,
        max_retries=0,
    )


@dataclass(frozen=True)
class Config:
    port: int
    api_key: str
    logging: LoggingConfig
    database: DatabaseConfig
    ai: AIConfig = field(default_factory=_default_ai_config)


@dataclass(frozen=True)
class EmptyConfig(Config):
    port: None = None
    api_key: None = None
    logging: None = None
    database: None = None
    ai: None = None

# --------------------------------------------------
# Config Schema
# --------------------------------------------------

A = TypeVar("A")
B = TypeVar("B")

def _return_same_option(x: A) -> B:
    return x

@dataclass(frozen=True)
class ConfigOption:
    validator: Callable[[Any], bool]
    """The validator function used to validate the config option"""
    default_value: Any = None
    """The default value for this option used """
    use_default_if_invalid: bool = False
    """Whether or not to use the default value for this option if the value provided is invalid"""
    required: bool = False
    """Whether this option is required to be defined in the config"""
    post_validator_func: Callable[[A], B] = _return_same_option
    """An optional converter function that converts the validated value to another type after successful validation.
    Note: Default values are also converted"""

    def validate(self, key_name: str, value: A | None) -> B:
        """Validates the value passed to the configuration option.
        If value is None (implying key not present in config): Return default value if not required else raise KeyError
        If value is invalid: Return default value if set to use the default value if invalid else raise ValueError
        If value is valid: Return the passed in value

        :param key_name: The key name used for error messages
        :param value: The value to validate
        :return: A validated value
        """
        # Check the result if the value is not set
        if value is None:
            if not self.required:
                _LOGGER.info(f"Using default value for field `{key_name}` as it was not defined in the loaded config file")
                return self.post_validator_func(self.default_value)
            raise KeyError(key_name, "Missing required field in the loaded config file")
        # Validate according to the respective validator
        if not self.validator(value):
            if self.use_default_if_invalid:
                _LOGGER.info(f"Using default value for field `{key_name}` as it was set to an invalid value in the loaded config file")
                return self.post_validator_func(self.default_value)
            raise ValueError(f"The field `{key_name}` was set to an invalid value in the config file but was required to be valid")
        # Return valid value
        return self.post_validator_func(value)


V = TypeVar("V", bound=dict[str, Any] | None)
W = TypeVar("W")

def _return_same_schema(x: V) -> W:
    return x

def _always_valid_schema(x: V, path: str):
    pass

@dataclass(frozen=True)
class ConfigSchema:
    items: dict[str, Union[ConfigOption, "ConfigSchema"]]
    """The child items defined in the schema"""
    post_validator_converter: Callable[[V], W] = _return_same_schema
    """An optional converter to convert the validated schema (after ``validate_schema`` is run) to another value"""
    required: bool = False
    """Whether the schema item is required to be defined in the config"""
    evaluate_if_empty: bool = True
    """Whether to evaluate this schema if it is empty.
    A schema is empty when no child ``ConfigOption`` values are defined and every
    child ``ConfigSchema`` is also empty. Non-evaluated schemas return None.
    Note: Evaluating schemas may raise a ``KeyError`` if their child items are required."""
    validator_func: Callable[[V, str], None] = _always_valid_schema
    """Determines whether the schema is valid after all items have been validated. Expects any issues to be raised as errors.
    Params:
        first_value: The validated schema (after all internal items have been validated)
        second_value: The path to this ConfigSchema
    """

    def _is_empty(self, value: V) -> bool:
        """Whether this schema has no defined child options and all child schemas are empty.

        :param value: The raw config value for this schema
        :return: True if the schema should be treated as empty
        """
        if value is None:
            return True
        if not isinstance(value, dict):
            return False
        for item_key, item in self.items.items():
            child_value = value.get(item_key)
            if isinstance(item, ConfigSchema):
                if not item._is_empty(child_value):
                    return False
            elif child_value is not None:
                return False
        return True

    def validate_schema(self, value: V, schema_path: str = "") -> W:
        """Validates the passed in value has all relevant schema items

        :param value: The dictionary of config items to validate. If value is None, then this schema is assumed to be not provided
        :param schema_path: The path to this schema used for error messages
        :return: The validated value after applying the ``post_validator_converter``. If ``evaluate_if_empty``
        is False, then this may be None when the schema is empty
        """
        # Treat as absent when no child options are defined and all child schemas are empty
        if self._is_empty(value):
            if self.required:
                raise ValueError(f"The field `{schema_path}` is required in the config but was not provided")
            if not self.evaluate_if_empty:
                return None
            value = {}
        # Validate each individual item
        for item_key, item in self.items.items():
            if isinstance(item, ConfigSchema):
                item_path = ".".join([schema_path, item_key]) if schema_path != "" else item_key
                result = item.validate_schema(value.get(item_key), item_path)
                if result is not None: # Is None if the schema is not present and does not evaluate children
                    value[item_key] = result
            else:
                value[item_key] = self._validate_item(item_key, value.get(item_key), schema_path)
        # Return validated value
        self.validator_func(value, schema_path)
        return self.post_validator_converter(value)

    def _validate_item(self, key: str, value: A, schema_path: str = "") -> B:
        """Validates the passed in ``value`` as according to the relevant schema ``key``

        :param key: The key to the relevant schema item relative to this schema
        :param value: The value to validate
        :param schema_path: The path used to this schema which is used for error messages. Empty strings imply the
        root schema
        :return: The validated schema dictionary after applying the ``post_validator_converter``
        """
        if key in self.items: # Attempt to validate a ConfigOption
            obj = self.items[key]
            key_name = ".".join([schema_path, key]) if schema_path != "" else key
            if isinstance(obj, ConfigSchema):
                raise TypeError(f"The config item `{key_name}` was expected to be a ConfigOption for validation but was a ConfigSchema. Check schema defined in `{__file__}`")
            return obj.validate(key_name, value)
        key_parts = key.split(".", 2)
        if key_parts[0] in self.items: # Continue validation pass to child schemas
            obj = self.items[key_parts[0]]
            child_key = ".".join([schema_path, key_parts[0]]) if schema_path != "" else key_parts[0]
            if isinstance(obj, ConfigOption):
                raise TypeError(f"The config item `{child_key}` was expected to be a ConfigSchema during config validation. Check the schema in `config.py`")
            elif len(key_parts) == 1:
                raise KeyError(f"{schema_path}.{key}", f"Did not specify a child item for the given ConfigSchema object")
            # Validate using child config schema
            return obj._validate_item(key_parts[1], value, child_key)
        raise KeyError(f"{schema_path}.{key}", "The field was not found in the validated configuration schema. Add this in the `config.py` schema")

# --------------------------------------------------
# Helpers
# --------------------------------------------------

_LOGGING_LEVELS = {
    "debug": logging.DEBUG,
    "info": logging.INFO,
    "warning": logging.WARNING,
    "error": logging.ERROR,
    "critical": logging.CRITICAL,
    "fatal": logging.FATAL
}


class DBType(Enum):
    SQLITE3 = "sqlite3"
    POSTGRES = "postgres"


class AIProvider(Enum):
    GEMINI = "gemini"
    STUB = "stub"


def _is_valid_path(path: Path | str, not_dir: bool | None = None) -> bool:
    try:
        Path(path).resolve()
        return not not_dir or not Path(path).is_dir()
    except:
        return False


def validate_correct_database_defined(config: dict[str, Any], schema_path: str):
    db_type = config["type"]
    assert isinstance(db_type, DBType)
    if db_type.value not in config:
        raise ValueError(
            f"`{schema_path}.type` is defined as `{db_type}` in the config file but required config `{schema_path}.{db_type}` is not set")


SCHEMA = ConfigSchema({
    "port": ConfigOption(lambda x: isinstance(x, int) and 1000 < x < 65535, 6486, True),
    "api_key": ConfigOption(lambda x: isinstance(x, str) and len(x) > 0, required=True),
    "logging": ConfigSchema({
        "file": ConfigOption(lambda x: _is_valid_path(x, True), None, True, post_validator_func=lambda x: x if x is None else Path(x)),
        "level": ConfigOption(lambda x: x.lower() in _LOGGING_LEVELS, "warning", True, post_validator_func=lambda x: _LOGGING_LEVELS[x.lower()]),
    }, lambda x: LoggingConfig(**x)),
    "database": ConfigSchema({
        "type": ConfigOption(lambda x: x in DBType, "sqlite3", post_validator_func=lambda x: DBType(x)),
        "sqlite3": ConfigSchema({
            "path": ConfigOption(lambda x: _is_valid_path(x, True), "./database.db", post_validator_func=lambda x: Path(x)),
        }, lambda x: SQLite3Config(**x)),
        "postgres": ConfigSchema({
            "host": ConfigOption(lambda x: isinstance(x, str) and len(x) > 0, "localhost"),
            "port": ConfigOption(lambda x: isinstance(x, int) and 1000 < x < 65535, 5432, True),
            "db_name": ConfigOption(lambda x: isinstance(x, str) and len(x) > 0, "no_idea"),
            "user": ConfigOption(lambda x: isinstance(x, str) and len(x) > 0, "no_idea_backend"),
            "password": ConfigOption(lambda x: isinstance(x, str) and len(x) > 0, required=True),
        }, lambda x: PostgresConfig(**x), evaluate_if_empty=False)
    }, lambda x: DatabaseConfig(**x), validator_func=validate_correct_database_defined),
    "ai": ConfigSchema({
        "provider": ConfigOption(lambda x: x in AIProvider, "gemini", True, post_validator_func=lambda x: AIProvider(x)),
        "api_key": ConfigOption(lambda x: isinstance(x, str) and len(x) > 0, None, True),
        "model": ConfigOption(lambda x: isinstance(x, str) and len(x) > 0, "gemini-3.5-flash-lite", True),
        "fast_model": ConfigOption(lambda x: isinstance(x, str) and len(x) > 0, "gemini-3.5-flash-lite", True),
        "timeout_seconds": ConfigOption(lambda x: isinstance(x, int) and 0 < x <= 120, 20, True),
        "max_retries": ConfigOption(lambda x: isinstance(x, int) and 0 <= x <= 5, 0, True),
    }, lambda x: AIConfig(**x))
}, lambda x: Config(**x))

# --------------------------------------------------
# Parsing and compilation
# --------------------------------------------------

_CONFIG: Config = EmptyConfig()


def parse_config_json(config: dict[str, Any]):
    """Validate and apply configuration from a dictionary.

    :param config: Raw configuration mapping (same shape as ``config.toml``).
    """
    global _CONFIG
    _CONFIG = SCHEMA.validate_schema(copy.deepcopy(config))


def parse_config(config_file: Path):
    """Load, validate, and apply configuration from a TOML file.

    :param config_file: Path to ``config.toml``. Missing files yield an empty config.
    """
    try:
        with config_file.open("rb") as handle:
            config = tomllib.load(handle)
    except FileNotFoundError:
        config = {}
    parse_config_json(config)


def get_config() -> Config:
    return _CONFIG