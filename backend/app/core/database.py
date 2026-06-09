from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings


@lru_cache(maxsize=1)
def get_engine():
    _connect_args = {}
    if settings.database_url.startswith("sqlite"):
        _connect_args["check_same_thread"] = False
    return create_engine(settings.database_url, connect_args=_connect_args)


def get_session():
    return sessionmaker(bind=get_engine(), autocommit=False, autoflush=False)()


class Base(DeclarativeBase):
    pass


def get_db():
    db = get_session()
    try:
        yield db
    finally:
        db.close()
