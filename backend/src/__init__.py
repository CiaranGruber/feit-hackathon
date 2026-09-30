from pathlib import Path

from src.config import Config

DEFAULT_CONFIG_FILE = Path(".") / "config.toml"
IMAGES_DIR = Path(".") / "images"
_CONFIG: Config | None = None
