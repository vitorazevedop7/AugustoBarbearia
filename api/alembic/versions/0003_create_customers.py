"""Cria a tabela de clientes e o vínculo com a conta Google (RN-23, RN-62)."""

import sqlalchemy as sa

from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "customers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("phone", sa.String(length=11), nullable=True),
        sa.Column("email", sa.String(length=320), nullable=True),
        sa.Column("auth_user_id", sa.String(length=255), nullable=True),
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
            "auth_user_id IS NOT NULL OR phone IS NOT NULL", name="ck_customers_phone"
        ),
        sa.CheckConstraint(
            "auth_user_id IS NULL OR email IS NOT NULL",
            name="ck_customers_google_email",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("auth_user_id", name="uq_customers_auth_user_id"),
        sa.UniqueConstraint("email", name="uq_customers_email"),
    )


def downgrade() -> None:
    op.drop_table("customers")
