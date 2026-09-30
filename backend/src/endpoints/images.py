"""
Image endpoints.

HTTP routes for serving image blobs.
"""
from typing import Annotated

from fastapi import APIRouter, HTTPException, Path
from fastapi.responses import Response

from src.modules import images
from src.modules.db_schema import ID_LENGTH

router = APIRouter(prefix="/image", tags=["images"])

IMAGE_ID_T = Annotated[str, Path(min_length=ID_LENGTH, max_length=ID_LENGTH)]


@router.get("/{image_id}")
async def get_image(image_id: IMAGE_ID_T) -> Response:
    """Return the raw image content for an image id."""
    try:
        image = images.get_image(image_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    return Response(content=image.content, media_type=image.media_type)
