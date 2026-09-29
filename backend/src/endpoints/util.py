"""
Shared endpoint utilities.
"""
from fastapi import Header, HTTPException

from src.config import get_config, _LOGGER


def verify_api_key(x_api_key: str = Header(...)):
    """Verifies an API key from the header of a request."""
    if x_api_key != get_config().api_key:
        _LOGGER.info("An invalid API key was provided to the server")
        raise HTTPException(status_code=401, detail="Invalid API Key")
    return x_api_key
