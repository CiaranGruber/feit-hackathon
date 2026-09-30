"""
Users Module.

All user-related API interactions are defined in this file
"""
import logging
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.app import app
from src.modules.db_schema import Tag, User, UserTagRelationship

_LOGGER = logging.getLogger(__name__)


@dataclass(frozen=True)
class UserData:
    id: str
    first_name: str


def get_user(user_id: str) -> UserData:
    # The SQL Statement used to get the user. Equivalent to "SELECT * FROM "USERS" WHERE "id" == "{user_id}""
    # As this isn't raw SQL, it is immune (as far as I know) to prompt injection attacks
    stmt = select(User).where(User.id == user_id)
    # Connect to the database and run the command
    with app().db_engine.connect() as conn:
        result = conn.execute(stmt).fetchone() # Fetches a single user (same as adding LIMIT 1 to the SQL statement)
        # If the user is not found, raise an error
        if result is None:
            raise KeyError(f"User '{user_id}' not found.")
        # Return user
        return UserData(result.id, result.first_name)


def get_user_stats(user_id: str) -> dict[str, float]:
    """
    Return tag relationship strengths for a user.

    :param user_id: The user's id.
    :return: Mapping of tag name to relationship value (0–1).
    :raises KeyError: If the user does not exist.
    """
    stmt = (
        select(Tag.name, UserTagRelationship.value)
        .join(Tag, Tag.id == UserTagRelationship.tag_id)
        .where(UserTagRelationship.user_id == user_id)
    )

    with Session(app().db_engine) as session:
        if session.get(User, user_id) is None:
            raise KeyError(f"User '{user_id}' not found.")
        return {row.name: row.value for row in session.execute(stmt)}
