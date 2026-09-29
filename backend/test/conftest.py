"""
Shared pytest fixtures for the No Idea backend tests.
"""
from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

import pytest

import src.app as app_module
from src.app import init_app
from src.config import Config, DatabaseConfig, DBType, LoggingConfig, SQLite3Config


@pytest.fixture
def app_db(tmp_path: Path) -> Iterator[None]:
    """Initialise the app singleton against a temporary SQLite database.

    :param tmp_path: Pytest temporary directory for the database file.
    """
    config = Config(
        port=6486,
        api_key="test-api-key",
        logging=LoggingConfig(file=None, level="warning"),
        database=DatabaseConfig(
            type=DBType.SQLITE3,
            sqlite3=SQLite3Config(path=tmp_path / "test.db"),
        ),
    )
    app_module._APP = None
    init_app(config)
    yield
    app_module._APP = None
