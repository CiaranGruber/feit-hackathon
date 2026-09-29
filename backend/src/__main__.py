"""
No Idea Backend Module

Running this file starts the No Idea backend instance
"""

import logging
import os
from pathlib import Path

import uvicorn

from src import DEFAULT_CONFIG_FILE
from src.endpoints.api import api
from src.config import parse_config, get_config
from src.app import init_app

LOGGER_FORMAT = "%(asctime)s:%(levelname)s:%(name)s - %(message)s"
CONFIG_ENV_VAR = "NO_IDEA_BE_CONFIG"


def main():
    # Get config file
    config_file = None
    try:
        if CONFIG_ENV_VAR in os.environ:
            config_file = Path(os.environ[CONFIG_ENV_VAR])
    except:
        pass
    if not config_file or not config_file.is_file():
        config_file = DEFAULT_CONFIG_FILE
    # Set app config
    parse_config(config_file)
    config = get_config()
    # Set up logger
    if config.logging.file:
        logging.basicConfig(
            filename=config.logging.file,
            encoding="utf-8",
            format=LOGGER_FORMAT,
            level=config.logging.level,
            force=True
        )
    else:
        logging.basicConfig(
            format=LOGGER_FORMAT,
            level=config.logging.level
        )
    # Initialise app
    logger = logging.getLogger(__name__)
    logger.info("Starting No Idea Backend")
    init_app(config)

    # Run FastAPI via Uvicorn
    uvicorn.run(api, port=config.port)


if __name__ == "__main__":
    main()