"""Cria a barbearia e o horário de funcionamento com os dados iniciais (RN-02)."""

from datetime import time

import sqlalchemy as sa

from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    shop = op.create_table(
        "shop",
        sa.Column("id", sa.SmallInteger(), autoincrement=False, nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("tagline", sa.String(length=160), nullable=True),
        sa.Column("about", sa.Text(), nullable=True),
        sa.Column("address", sa.String(length=200), nullable=True),
        sa.Column("phone", sa.String(length=11), nullable=True),
        sa.Column("whatsapp", sa.String(length=11), nullable=True),
        sa.Column("instagram", sa.String(length=30), nullable=True),
        sa.Column("email", sa.String(length=254), nullable=True),
        sa.CheckConstraint("id = 1", name="ck_shop_single_row"),
        sa.PrimaryKeyConstraint("id"),
    )
    business_hours = op.create_table(
        "business_hours",
        sa.Column("weekday", sa.SmallInteger(), autoincrement=False, nullable=False),
        sa.Column("opens_at", sa.Time(), nullable=True),
        sa.Column("closes_at", sa.Time(), nullable=True),
        sa.CheckConstraint(
            "(opens_at IS NULL AND closes_at IS NULL)"
            " OR (opens_at IS NOT NULL AND closes_at IS NOT NULL"
            " AND opens_at < closes_at)",
            name="ck_business_hours_interval",
        ),
        sa.CheckConstraint("weekday BETWEEN 0 AND 6", name="ck_business_hours_weekday"),
        sa.PrimaryKeyConstraint("weekday"),
    )

    # Os contatos reais são preenchidos pela administração.
    op.bulk_insert(shop, [{"id": 1, "name": "Augusto Barbearia"}])
    # RN-02: seg–sex 10h–19h, sáb 9h–14h, dom fechado.
    weekdays = [
        {"weekday": weekday, "opens_at": time(10), "closes_at": time(19)}
        for weekday in range(5)
    ]
    op.bulk_insert(
        business_hours,
        [
            *weekdays,
            {"weekday": 5, "opens_at": time(9), "closes_at": time(14)},
            {"weekday": 6, "opens_at": None, "closes_at": None},
        ],
    )


def downgrade() -> None:
    op.drop_table("business_hours")
    op.drop_table("shop")
