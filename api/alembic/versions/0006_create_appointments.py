"""Cria os agendamentos, com a exclusion constraint da RN-08."""

import sqlalchemy as sa

from alembic import op

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "appointments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("customer_id", sa.Integer(), nullable=False),
        sa.Column("barber_id", sa.Integer(), nullable=False),
        sa.Column("service_id", sa.Integer(), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("price", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            sa.String(length=20),
            server_default="SCHEDULED",
            nullable=False,
        ),
        sa.Column("source", sa.String(length=20), nullable=False),
        sa.Column("canceled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("canceled_by", sa.String(length=20), nullable=True),
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
        sa.CheckConstraint(
            "status IN ('SCHEDULED', 'COMPLETED', 'CANCELED', 'NO_SHOW')",
            name="ck_appointments_status",
        ),
        sa.CheckConstraint(
            "source IN ('ONLINE', 'ADMIN')", name="ck_appointments_source"
        ),
        sa.CheckConstraint(
            "canceled_by IN ('CUSTOMER', 'ADMIN')", name="ck_appointments_canceled_by"
        ),
        # RN-33: o cancelamento sempre registra quando e quem; só ele registra.
        sa.CheckConstraint(
            "(status = 'CANCELED') = (canceled_at IS NOT NULL)"
            " AND (canceled_at IS NULL) = (canceled_by IS NULL)",
            name="ck_appointments_cancellation",
        ),
        # RN-13: preço e duração congelados; o fim é sempre início + duração.
        sa.CheckConstraint("price >= 0", name="ck_appointments_price_non_negative"),
        sa.CheckConstraint("duration_minutes > 0", name="ck_appointments_duration"),
        sa.CheckConstraint(
            "ends_at = starts_at + make_interval(mins => duration_minutes)",
            name="ck_appointments_ends_at",
        ),
        sa.ForeignKeyConstraint(["customer_id"], ["customers.id"]),
        sa.ForeignKeyConstraint(["barber_id"], ["barbers.id"]),
        sa.ForeignKeyConstraint(["service_id"], ["services.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_appointments_customer_id", "appointments", ["customer_id"], unique=False
    )
    # RN-08: dois agendamentos ativos do mesmo barbeiro nunca se cruzam, nem com
    # transações simultâneas. Usa a extensão btree_gist (migração 0001) para o
    # `=` no inteiro. O intervalo é [início, fim): encostar no fim é permitido.
    op.execute(
        "ALTER TABLE appointments ADD CONSTRAINT ex_appointments_barber_overlap"
        " EXCLUDE USING gist"
        " (barber_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&)"
        " WHERE (status = 'SCHEDULED')"
    )


def downgrade() -> None:
    op.drop_index("ix_appointments_customer_id", table_name="appointments")
    op.drop_table("appointments")
