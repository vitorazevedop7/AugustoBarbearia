"""Conexão e sessões SQLAlchemy; transações são decididas pelos services."""

from collections.abc import Iterator
from functools import lru_cache

from sqlalchemy import Engine, create_engine
from sqlalchemy.engine import URL, make_url
from sqlalchemy.orm import DeclarativeBase, Session

from app.config import get_settings


class Base(DeclarativeBase):
    """Base dos modelos de domínio, com Mapped e mapped_column."""


def database_url(value: str) -> URL:
    """Usa Psycopg 3 sem mudar a URL compartilhada com o web."""
    url = make_url(value)
    if url.drivername not in {"postgres", "postgresql", "postgresql+psycopg"}:
        raise ValueError("DATABASE_URL deve apontar para PostgreSQL com Psycopg 3.")
    return url.set(drivername="postgresql+psycopg")


def create_db_engine(url: URL) -> Engine:
    return create_engine(url, pool_pre_ping=True, connect_args={"connect_timeout": 5})


@lru_cache
def get_engine() -> Engine:
    return create_db_engine(database_url(get_settings().database_url))


def get_session() -> Iterator[Session]:
    """Fecha e desfaz alterações sem commit, inclusive em caso de exceção."""
    with Session(get_engine()) as session:
        yield session
