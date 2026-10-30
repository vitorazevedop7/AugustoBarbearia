import importlib.util
from collections.abc import Callable
from pathlib import Path
from types import ModuleType

from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import Connection, text
from sqlalchemy.orm import Session

MIGRATION = (
    Path(__file__).parents[1]
    / "alembic"
    / "versions"
    / "0007_barber_placeholder_photos.py"
)


def load_migration() -> ModuleType:
    """Carrega só a 0007, sem passar pelas migrações que vierem depois dela."""
    spec = importlib.util.spec_from_file_location("migration_0007", MIGRATION)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def run_step(connection: Connection, step: Callable[[], None]) -> None:
    with Operations.context(MigrationContext.configure(connection)):
        step()


def test_rn63_migracao_preserva_foto_editada_e_identifica_proprietarios_por_id(
    db_session: Session,
) -> None:
    connection = db_session.connection()
    migration = load_migration()
    run_step(connection, migration.downgrade)
    connection.execute(
        text(
            "UPDATE barbers SET photo_path = '/images/barbeiros/foto-real.jpg', "
            "bio = 'Apresentação real.', active = false WHERE id = 1"
        )
    )
    connection.execute(text("UPDATE barbers SET name = 'Lauro Silva' WHERE id = 2"))
    connection.execute(text("INSERT INTO barbers (name) VALUES ('Manoel')"))

    run_step(connection, migration.upgrade)

    rows = (
        connection.execute(
            text("SELECT id, name, photo_path, bio, active FROM barbers ORDER BY id")
        )
        .mappings()
        .all()
    )
    assert rows[0]["photo_path"] == "/images/barbeiros/foto-real.jpg"
    assert rows[0]["bio"] == "Apresentação real."
    assert rows[0]["active"] is False
    assert rows[1]["name"] == "Lauro Silva"
    assert rows[1]["photo_path"] == "/images/barbeiros/lauro.jpg"
    assert rows[2]["photo_path"] == "/images/barbeiros/manoel.jpg"
    assert rows[3]["name"] == "Manoel"
    assert rows[3]["photo_path"] is None

    # O rollback também preserva a foto real e os demais dados administrativos.
    run_step(connection, migration.downgrade)
    photos = (
        connection.execute(text("SELECT photo_path FROM barbers ORDER BY id"))
        .scalars()
        .all()
    )
    assert photos == ["/images/barbeiros/foto-real.jpg", None, None, None]
