from pathlib import Path

from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.orm import Session

from alembic import command


def test_rn63_migracao_preserva_foto_editada_e_identifica_proprietarios_por_id(
    db_session: Session,
) -> None:
    connection = db_session.connection()
    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    config.attributes["connection"] = connection
    command.downgrade(config, "0006")
    connection.execute(
        text(
            "UPDATE barbers SET photo_path = '/images/barbeiros/foto-real.jpg', "
            "bio = 'Apresentação real.', active = false WHERE id = 1"
        )
    )
    connection.execute(text("UPDATE barbers SET name = 'Lauro Silva' WHERE id = 2"))
    connection.execute(text("INSERT INTO barbers (name) VALUES ('Manoel')"))

    command.upgrade(config, "head")

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
    command.downgrade(config, "0006")
    photos = (
        connection.execute(text("SELECT photo_path FROM barbers ORDER BY id"))
        .scalars()
        .all()
    )
    assert photos == ["/images/barbeiros/foto-real.jpg", None, None, None]
