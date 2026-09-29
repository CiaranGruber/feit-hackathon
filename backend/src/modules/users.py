"""
Users Module.

All user-related API interactions are defined in this file
"""
import logging
from dataclasses import dataclass

from sqlalchemy import select, text

from src.app import app

_LOGGER = logging.getLogger(__name__)

@dataclass(frozen=True)
class User:
    id: str
    first_name: str


def get_user(user_id: str) -> User:
    # The SQL Statement used to get the user. Equivalent to "SELECT * FROM "USERS" WHERE "id" == "{user_id}""
    # As this isn't raw SQL, it is immune (as far as I know) to prompt injection attacks
    stmt = select(User).where(User.c.id == user_id)
    # Connect to the database and run the command
    with app().db_engine.connect() as conn:
        result = conn.execute(stmt).fetchone() # Fetches a single user (same as adding LIMIT 1 to the SQL statement)
        # If the user is not found, raise an error
        if result is None:
            raise KeyError(f"User '{user_id}' not found.")
        # Return user
        return User(result.id, result.first_name)
