from sqlalchemy import create_engine

from src.config import Config, DBType
from src.modules.db_schema import Base


class NoIdeaApp:
    """The No Idea Backend App"""
    def __init__(self, config: Config) -> None:
        # Initialise database
        match config.database.type:
            case DBType.POSTGRES:
                pg_config = config.database.postgres
                assert pg_config is not None  # Should have been validated during configuration
                self.db_engine = create_engine(f"postgresql://{pg_config.user}:{pg_config.password}@"
                                                f"{pg_config.host}:{pg_config.port}/{pg_config.db_name}")
            case DBType.SQLITE3:
                sqlite_config = config.database.sqlite3
                assert sqlite_config is not None  # Should have been validated during configuration
                self.db_engine = create_engine(f"sqlite:///{sqlite_config.path}")
        # Ensure database is set up correctly
        self.validate_database()

    def validate_database(self):
        Base.metadata.create_all(self.db_engine)


class AppNotInitialisedError(Exception):
    pass


def init_app(config: Config):
    global _APP
    _APP = NoIdeaApp(config)


def app() -> NoIdeaApp:
    """Gets the Singleton-based app instance

    Raises:
        AppNotInitialisedError: Raised if app that app has not been initialised yet
    """
    global _APP
    if _APP is not None:
        return _APP
    raise AppNotInitialisedError("The app backend has not yet been initialised")


_APP: NoIdeaApp | None = None