"""Migrações do domínio; tabelas do Better Auth pertencem ao web (ADR 0002)."""

from sqlalchemy import Connection

from alembic import context
from app.db import Base, get_engine

# Ao criar modelos, importe-os aqui para registrar suas tabelas em Base.metadata.
AUTH_TABLES = {"user", "session", "account", "verification", "jwks"}


def include_name(
    name: str | None, type_: str, parent_names: dict[str, str | None]
) -> bool:
    return not (type_ == "table" and name in AUTH_TABLES)


def run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=Base.metadata,
        include_name=include_name,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


if context.is_offline_mode():
    context.configure(
        url=get_engine().url,
        target_metadata=Base.metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()
else:
    # Os testes fornecem a conexão do banco separado, sem alterar DATABASE_URL.
    connection = context.config.attributes.get("connection")
    if connection is not None:
        run_migrations(connection)
    else:
        with get_engine().connect() as connection:
            run_migrations(connection)
