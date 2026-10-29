"""Cria a tabela de barbeiros com os três proprietários (RN-60, RN-63)."""

import sqlalchemy as sa

from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    barbers = op.create_table(
        "barbers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("photo_path", sa.String(length=200), nullable=True),
        sa.Column("bio", sa.String(length=400), nullable=True),
        sa.Column(
            "active", sa.Boolean(), server_default=sa.text("true"), nullable=False
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # RN-63: os três proprietários. As fotos placeholder (D10) entram na S3.10 e
    # a apresentação é preenchida pela administração.
    op.bulk_insert(barbers, [{"name": name} for name in ("Edvaldo", "Lauro", "Manoel")])


def downgrade() -> None:
    op.drop_table("barbers")
