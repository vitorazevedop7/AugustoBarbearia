from collections.abc import Iterator
from pathlib import Path

import pytest
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import Engine, text
from sqlalchemy.orm import Session

from alembic import command
from app.config import get_settings
from app.db import create_db_engine, database_url, get_session
from app.main import create_app


@pytest.fixture(scope="session")
def migrated_engine() -> Iterator[Engine]:
    source_url = database_url(get_settings().database_url)
    if not source_url.database:
        raise ValueError("DATABASE_URL precisa informar o banco de desenvolvimento.")
    test_name = f"{source_url.database}_test"
    if len(test_name.encode()) > 63:
        raise ValueError("Nome do banco de teste excede 63 bytes.")
    admin_engine = create_db_engine(source_url)
    try:
        with admin_engine.connect().execution_options(
            isolation_level="AUTOCOMMIT"
        ) as connection:
            exists = connection.scalar(
                text("SELECT 1 FROM pg_database WHERE datname = :name"),
                {"name": test_name},
            )
            if not exists:
                quoted = connection.dialect.identifier_preparer.quote(test_name)
                connection.execute(text(f"CREATE DATABASE {quoted}"))
    finally:
        admin_engine.dispose()

    engine = create_db_engine(source_url.set(database=test_name))
    try:
        with engine.begin() as connection:
            config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
            config.attributes["connection"] = connection
            command.upgrade(config, "head")
        yield engine
    finally:
        engine.dispose()


@pytest.fixture
def db_session(migrated_engine: Engine) -> Iterator[Session]:
    with migrated_engine.connect() as connection:
        transaction = connection.begin()
        try:
            with Session(
                bind=connection, join_transaction_mode="create_savepoint"
            ) as session:
                yield session
        finally:
            transaction.rollback()


@pytest.fixture
def client(db_session: Session) -> Iterator[TestClient]:
    app = create_app()
    app.dependency_overrides[get_session] = lambda: db_session
    with TestClient(app) as test_client:
        yield test_client
