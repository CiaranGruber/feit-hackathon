from typing import Annotated

from fastapi import FastAPI, Header, HTTPException, Depends, Path
from starlette.middleware.cors import CORSMiddleware

from src.config import get_config, _LOGGER
from src.modules import users

api = FastAPI()


api.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def verify_api_key(x_api_key: str = Header(...)):
    """Verifies an API key from the header of a request"""
    if x_api_key != get_config().api_key:
        _LOGGER.info("An invalid API key was provided to the server")
        raise HTTPException(status_code=401, detail="Invalid API Key")
    return x_api_key


@api.get("/")
async def root():
    return {"message": "Welcome to the No Idea backend API"}


@api.get("/hello/{name}", dependencies=[Depends(verify_api_key)])
async def say_hello(name: str):
    """An example of a function that requires an API key to accept connections"""
    return {"message": f"Hello {name}"}


@api.get("/user/{user_id}", dependencies=[Depends(verify_api_key)])
async def get_user(user_id: Annotated[str, Path(min_length=36, max_length=36)]):
    """An example of retrieving a user from the database"""
    try:
        # Returns the result of the get_user command,
        user = users.get_user(user_id)
        # Example excludes ID from the API query although this would be odd given the person querying has the ID already
        return {
            "first_name": user.first_name,
        }
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
