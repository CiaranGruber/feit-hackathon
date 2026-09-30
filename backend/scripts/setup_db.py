"""
Set up the No Idea database schema and load seed data.

Creates tables from the SQLAlchemy models, then executes ``scripts/seed.sql``.
Run from the backend root (with ``./.venv`` activated):

    python scripts/setup_db.py
"""
from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

from sqlalchemy import text

# Ensure the backend root is importable when run as a script.
_BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from src import DEFAULT_CONFIG_FILE
from src.app import app, init_app
from src.config import get_config, parse_config

_LOGGER = logging.getLogger(__name__)

CONFIG_ENV_VAR = "NO_IDEA_BE_CONFIG"
SEED_FILE = Path(__file__).resolve().parent / "seed.sql"
LOGGER_FORMAT = "%(levelname)s:%(name)s - %(message)s"


def _resolve_config_file() -> Path:
    """Resolve the config file path from the environment or the default location.

    :return: Path to the config.toml file to load.
    """
    config_file: Path | None = None
    if CONFIG_ENV_VAR in os.environ:
        config_file = Path(os.environ[CONFIG_ENV_VAR])
    if config_file is None or not config_file.is_file():
        config_file = DEFAULT_CONFIG_FILE
    return config_file


def _split_sql_statements(sql: str) -> list[str]:
    """Split a SQL script into individual statements.

    Strips full-line ``--`` comments, then splits on ``;`` while ignoring
    semicolons inside single-quoted string literals (``''`` escapes supported).

    :param sql: Full SQL script contents.
    :return: Non-empty SQL statements without trailing semicolons.
    """
    without_comments = "\n".join(
        line
        for line in sql.splitlines()
        if line.strip() and not line.strip().startswith("--")
    )

    statements: list[str] = []
    current: list[str] = []
    in_string = False
    index = 0
    while index < len(without_comments):
        char = without_comments[index]
        if in_string:
            current.append(char)
            if char == "'":
                # Escaped quote inside a literal: ''
                if (
                    index + 1 < len(without_comments)
                    and without_comments[index + 1] == "'"
                ):
                    current.append("'")
                    index += 2
                    continue
                in_string = False
            index += 1
            continue

        if char == "'":
            in_string = True
            current.append(char)
        elif char == ";":
            statement = "".join(current).strip()
            if statement:
                statements.append(statement)
            current = []
        else:
            current.append(char)
        index += 1

    trailing = "".join(current).strip()
    if trailing:
        statements.append(trailing)
    return statements


def run_seed(seed_path: Path = SEED_FILE):
    """Execute the seed SQL script against the configured database.

    :param seed_path: Path to the ``.sql`` seed file.
    :raises FileNotFoundError: If the seed file does not exist.
    """
    if not seed_path.is_file():
        raise FileNotFoundError(f"Seed file not found: {seed_path}")

    sql = seed_path.read_text(encoding="utf-8")
    statements = _split_sql_statements(sql)
    with app().db_engine.begin() as conn:
        for statement in statements:
            conn.execute(text(statement))

    _LOGGER.info(
        "Applied %s seed statement(s) from %s.",
        len(statements),
        seed_path,
    )


def main():
    logging.basicConfig(format=LOGGER_FORMAT, level=logging.INFO)

    config_file = _resolve_config_file()
    _LOGGER.info("Loading config from %s", config_file.resolve())
    parse_config(config_file)
    config = get_config()

    _LOGGER.info("Creating database tables for type '%s'.", config.database.type.value)
    init_app(config)

    _LOGGER.info("Seeding database from %s", SEED_FILE)
    run_seed(SEED_FILE)
    _LOGGER.info("Database setup complete.")


if __name__ == "__main__":
    main()
