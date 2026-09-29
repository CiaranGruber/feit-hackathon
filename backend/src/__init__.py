from pathlib import Path

from src.config import Config

DEFAULT_CONFIG_FILE = Path(".") / "config.toml"
_CONFIG: Config | None = None