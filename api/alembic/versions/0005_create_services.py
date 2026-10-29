"""Cria os serviços e quem os realiza, com os dados iniciais (RN-61, RN-63)."""

from decimal import Decimal

import sqlalchemy as sa

from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    services = op.create_table(
        "services",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("description", sa.String(length=400), nullable=True),
        sa.Column("price", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
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
        sa.CheckConstraint("price >= 0", name="ck_services_price_non_negative"),
        sa.CheckConstraint(
            "duration_minutes >= 10 AND duration_minutes % 5 = 0",
            name="ck_services_duration",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "barber_services",
        sa.Column("barber_id", sa.Integer(), nullable=False),
        sa.Column("service_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["barber_id"], ["barbers.id"]),
        sa.ForeignKeyConstraint(["service_id"], ["services.id"]),
        sa.PrimaryKeyConstraint("barber_id", "service_id"),
    )

    # RN-63: os serviços do projeto acadêmico, até os preços reais (P9).
    op.bulk_insert(
        services,
        [
            {
                "name": "Corte Simples",
                "price": Decimal("25.00"),
                "duration_minutes": 30,
            },
            {
                "name": "Corte + Barba",
                "price": Decimal("35.00"),
                "duration_minutes": 45,
            },
        ],
    )
    # RN-63: os três proprietários realizam os dois serviços.
    op.execute(
        "INSERT INTO barber_services (barber_id, service_id)"
        " SELECT barbers.id, services.id FROM barbers CROSS JOIN services"
        " WHERE barbers.name IN ('Edvaldo', 'Lauro', 'Manoel')"
    )


def downgrade() -> None:
    op.drop_table("barber_services")
    op.drop_table("services")
