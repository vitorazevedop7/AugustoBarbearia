"""Migrações do domínio; tabelas do Better Auth pertencem ao web (ADR 0002)."""

from sqlalchemy import Connection
from sqlalchemy.schema import SchemaItem

from alembic import context
from app.db import Base, get_engine

# Ao criar modelos, importe-os aqui para registrar suas tabelas em Base.metadata.
AUTH_TABLES = {"user", "session", "account", "verification", "jwks"}


def include_name(
    name: str | None, type_: str, parent_names: dict[str, str | None]
) -> bool:
    """Filtra o que o Alembic lê do banco."""
    return not (type_ == "table" and name in AUTH_TABLES)


def include_object(
    object_: SchemaItem,
    name: str | None,
    type_: str,
    reflected: bool,
    compare_to: SchemaItem | None,
) -> bool:
    """Filtra também o que está nos modelos: uma tabela de auth declarada só para
    servir de alvo de FK (ex.: `user.id`) nunca vira `create_table`/`drop_table`."""
    return not (type_ == "table" and name in AUTH_TABLES)


def run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=Base.metadata,
        include_name=include_name,
        include_object=include_object,
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
