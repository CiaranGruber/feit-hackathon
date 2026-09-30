"""
Images Module.

All image-related database and filesystem interactions are defined in this file.
"""
from __future__ import annotations

import logging
import mimetypes
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy.orm import Session

from src import IMAGES_DIR
from src.app import app
from src.modules.db_schema import Image

_LOGGER = logging.getLogger(__name__)


@dataclass(frozen=True)
class ImageBlob:
    """Raw image bytes with a MIME type suitable for HTTP responses."""

    content: bytes
    media_type: str


def get_image(image_id: str) -> ImageBlob:
    """
    Load an image's file content by id.

    Looks up the image row, then reads the file under ``IMAGES_DIR`` using
    ``image_path`` as a path relative to that directory.

    :param image_id: The image's id.
    :return: Image bytes and MIME type.
    :raises KeyError: If the image is missing from the database or on disk.
    """
    # Get image path
    with Session(app().db_engine) as session:
        row = session.get(Image, image_id)
        if row is None:
            raise KeyError(f"Image '{image_id}' not found.")
        image_path = row.image_path

    # Resolve image path
    file_path = _resolve_image_path(image_path)
    if not file_path.is_file():
        raise KeyError(f"Image file for '{image_id}' not found.")

    # Get media type
    media_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
    return ImageBlob(content=file_path.read_bytes(), media_type=media_type)


def _resolve_image_path(image_path: str) -> Path:
    """
    Resolve ``image_path`` under ``IMAGES_DIR``, rejecting path traversal.

    :param image_path: Path relative to ``IMAGES_DIR``.
    :return: Absolute path to the image file.
    :raises KeyError: If the path escapes ``IMAGES_DIR``.
    """
    images_root = IMAGES_DIR.resolve()
    candidate = (IMAGES_DIR / image_path).resolve()
    if not candidate.is_relative_to(images_root):
        raise KeyError(f"Image path '{image_path}' is invalid.")
    return candidate
