"""Cria os bloqueios da agenda dos barbeiros (RN-03)."""

import sqlalchemy as sa

from alembic import op

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "time_blocks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("barber_id", sa.Integer(), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reason", sa.String(length=120), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("ends_at > starts_at", name="ck_time_blocks_range"),
        sa.ForeignKeyConstraint(["barber_id"], ["barbers.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    # Dois bloqueios do mesmo barbeiro nunca se cruzam. O índice GiST também
    # atende a busca dos ocupados por barbeiro e intervalo (RN-05, item 3).
    op.execute(
        "ALTER TABLE time_blocks ADD CONSTRAINT ex_time_blocks_barber_overlap"
        " EXCLUDE USING gist"
        " (barber_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&)"
    )


def downgrade() -> None:
    op.drop_table("time_blocks")
