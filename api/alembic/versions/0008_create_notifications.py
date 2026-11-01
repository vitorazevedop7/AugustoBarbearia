"""Cria o registro dos e-mails ao cliente (RN-50 a RN-54, ADR 0006)."""

import sqlalchemy as sa

from alembic import op

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("appointment_id", sa.Integer(), nullable=False),
        sa.Column("kind", sa.String(length=20), nullable=False),
        sa.Column("recipient", sa.String(length=320), nullable=False),
        sa.Column(
            "status", sa.String(length=20), server_default="PENDING", nullable=False
        ),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
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
            "kind IN ('CONFIRMATION', 'REMINDER', 'RESCHEDULED', 'CANCELED')",
            name="ck_notifications_kind",
        ),
        sa.CheckConstraint(
            "status IN ('PENDING', 'SENT', 'FAILED')", name="ck_notifications_status"
        ),
        # Só o enviado tem data de envio; só a falha tem erro (RN-54).
        sa.CheckConstraint(
            "(status = 'SENT') = (sent_at IS NOT NULL)",
            name="ck_notifications_sent_at",
        ),
        sa.CheckConstraint(
            "(status = 'FAILED') = (error IS NOT NULL)",
            name="ck_notifications_error",
        ),
        sa.ForeignKeyConstraint(["appointment_id"], ["appointments.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_notifications_appointment_id",
        "notifications",
        ["appointment_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_notifications_appointment_id", table_name="notifications")
    op.drop_table("notifications")
