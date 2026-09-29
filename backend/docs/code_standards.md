# Coding Standards

This document describes the main conventions for extending the No Idea backend.

---

## Adding config items

All configuration is loaded from `config.toml` and validated in `src/config.py`. New options must be registered in three places: the typed dataclass, the validation schema, and (usually) `config.toml.example`.

### 1. Define a typed field

Add the option to the appropriate frozen dataclass near the top of `config.py` (for example `Config`, or a nested type such as `LoggingConfig` / `DatabaseConfig`).

```python
@dataclass(frozen=True)
class Config:
    port: int
    api_key: str
    logging: LoggingConfig
    database: DatabaseConfig
    feature_flag: bool  # new top-level option
```

For a new nested group, add a dedicated dataclass and nest it under `Config` (or another parent).

### 2. Register it in `SCHEMA`

Every option needs a `ConfigOption` (or nested `ConfigSchema`) in the root `SCHEMA` object.

| Parameter | Purpose |
|---|---|
| `validator` | Returns `True` when the value is acceptable |
| `default_value` | Used when the key is missing (unless `required=True`) |
| `use_default_if_invalid` | Fall back to the default instead of raising on bad input |
| `required` | Fail if the key is absent |
| `post_validator_func` | Convert a valid value (e.g. `str` → `Path`, `str` → `Enum`) |

**Simple option example:**

```python
"feature_flag": ConfigOption(
    lambda x: isinstance(x, bool),
    default_value=False,
    use_default_if_invalid=True,
),
```

**Nested group example:**

```python
"logging": ConfigSchema({
    "file": ConfigOption(...),
    "level": ConfigOption(...),
}, lambda x: LoggingConfig(**x)),
```

Use `evaluate_if_empty=False` on nested schemas that should stay `None` when omitted (see `database.postgres`). Use `validator_func` on a `ConfigSchema` for cross-field checks (see `validate_correct_database_defined`).

### 3. Document it in `config.toml.example`

Add a commented entry so operators know the key name, type, and expected values.

### 4. Read it at runtime

```python
from src.config import get_config

value = get_config().feature_flag
```

Do not read `config.toml` directly elsewhere. Always go through `get_config()` after `parse_config()` has run at startup.

---

## Adding endpoints

HTTP routes live in `src/api.py` on the shared `api = FastAPI()` instance.

### Pattern

1. Declare the route with a FastAPI decorator (`@api.get`, `@api.post`, etc.).
2. Keep request/response shaping and HTTP errors in the endpoint.
3. Delegate business logic (database access, external APIs) to a module under `src/modules/`.
4. Protect privileged routes with `dependencies=[Depends(verify_api_key)]`. Clients must send the `x-api-key` header matching `config.api_key`.

**Minimal protected endpoint:**

```python
@api.get("/hello/{name}", dependencies=[Depends(verify_api_key)])
async def say_hello(name: str):
    return {"message": f"Hello {name}"}
```

**Endpoint that uses a module:**

```python
@api.get("/user/{user_id}", dependencies=[Depends(verify_api_key)])
async def get_user(user_id: Annotated[str, Path(min_length=36, max_length=36)]):
    try:
        user = users.get_user(user_id)
        return {"first_name": user.first_name}
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
```

### Guidelines

- Validate path/query/body inputs with FastAPI/`Annotated` constraints where useful.
- Map domain errors from modules (e.g. `KeyError`) to appropriate `HTTPException` status codes.
- Do not put SQLAlchemy queries or provider SDK calls directly in `api.py`.
- Optionally add a request to `test_main.http` for manual checks.

---

## Adding SQL database tables

ORM models live in `src/modules/db_schema.py` and use modern SQLAlchemy 2.0 Declarative style.

### Pattern

1. Subclass `Base` (the shared `DeclarativeBase`).
2. Set `__tablename__`.
3. Declare columns with `Mapped[...]` and `mapped_column(...)`.
4. Ensure the model module is imported before `Base.metadata.create_all` runs (via `NoIdeaApp.validate_database()`), so the table is registered on metadata.

**Example:**

```python
class User(Base):
    """A registered user."""

    __tablename__ = "USERS"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    first_name: Mapped[str] = mapped_column(String, nullable=False)
```

### Guidelines

- Prefer `Mapped[T]` / `mapped_column` over legacy `Column`-only style on classes.
- Use `Mapped[T | None]` for nullable fields.
- Add `relationship(...)` only when there is a real foreign-key link between models.
- Table creation is handled through `Base.metadata.create_all(self.db_engine)` in `app.py`; do not create tables ad hoc in modules.
- Keep schema definitions in `db_schema.py`; keep query helpers in domain modules (e.g. `users.py`).

---

## Interacting with the database and external providers (modules)

All non-HTTP integration work belongs under `src/modules/`. Endpoints call modules; modules talk to the database or external services.

### Layout

| Layer | Responsibility |
|---|---|
| `src/api.py` | Routes, auth dependency, HTTP status codes, response JSON |
| `src/modules/*.py` | Domain operations (users, future providers, etc.) |
| `src/modules/db_schema.py` | ORM table definitions only |
| `src/app.py` | Shared app singleton, including `db_engine` |

### Database access

1. Obtain the engine from the app singleton: `app().db_engine`.
2. Run SQLAlchemy statements inside a connection/session context.
3. Return plain domain objects (e.g. dataclasses) or ORM instances as appropriate for callers.
4. Raise clear domain errors (e.g. `KeyError` when a row is missing) and let the API layer translate them to HTTP responses.

**Illustrative module shape:**

```python
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.app import app
from src.modules.db_schema import User as UserRow


def get_user(user_id: str) -> User:
    with Session(app().db_engine) as session:
        result = session.scalar(select(UserRow).where(UserRow.id == user_id))
        if result is None:
            raise KeyError(f"User '{user_id}' not found.")
        return User(result.id, result.first_name)
```

Prefer SQLAlchemy constructs (`select`, `Session`) over raw SQL. Avoid string-built queries.

### External providers

Treat third-party APIs the same way as the database:

1. Add a dedicated module (e.g. `src/modules/payments.py`) for that provider.
2. Put API keys, base URLs, and timeouts in `config.py` / `config.toml` — never hard-code secrets.
3. Expose small functions the API (or other modules) can call.
4. Log failures with the module logger; raise domain-specific errors for the API layer to map to HTTP status codes.

### Guidelines

- One concern per module file (users, a single provider, etc.).
- Modules may import `app()` and `get_config()`; they should not import FastAPI route objects.
- Keep side effects (network I/O, commits) inside the module functions that own them.
- Use module-level loggers: `logging.getLogger(__name__)`.
