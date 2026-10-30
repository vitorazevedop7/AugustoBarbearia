"""Preenche fotos placeholder dos proprietários sem substituir fotos reais (RN-63)."""

import sqlalchemy as sa

from alembic import op

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None

# A 0004 cria a tabela vazia e insere os proprietários nesta ordem. O ID mantém
# a identidade mesmo se a administração editar o nome ou cadastrar um homônimo.
OWNER_PHOTOS = (
    (1, "/images/barbeiros/edvaldo.jpg"),
    (2, "/images/barbeiros/lauro.jpg"),
    (3, "/images/barbeiros/manoel.jpg"),
)


def upgrade() -> None:
    # RN-63, D10: completa apenas os proprietários que continuam sem foto.
    for barber_id, photo_path in OWNER_PHOTOS:
        op.execute(
            sa.text(
                "UPDATE barbers SET photo_path = :photo_path "
                "WHERE id = :id AND photo_path IS NULL"
            ).bindparams(id=barber_id, photo_path=photo_path)
        )


def downgrade() -> None:
    # Preserva qualquer caminho que a administração tenha trocado depois.
    for barber_id, photo_path in OWNER_PHOTOS:
        op.execute(
            sa.text(
                "UPDATE barbers SET photo_path = NULL "
                "WHERE id = :id AND photo_path = :photo_path"
            ).bindparams(id=barber_id, photo_path=photo_path)
        )
