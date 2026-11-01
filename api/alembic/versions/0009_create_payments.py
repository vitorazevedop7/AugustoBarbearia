"""Cria os pagamentos e registra quem concluiu ou marcou falta (RN-33, RN-40)."""

import sqlalchemy as sa

from alembic import op

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "appointments",
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "appointments", sa.Column("closed_by", sa.String(length=320), nullable=True)
    )
    # Nenhuma rota concluía agendamentos antes desta migração, mas um banco de
    # desenvolvimento pode ter linhas ajustadas à mão: preenche antes da constraint.
    op.execute(
        "UPDATE appointments SET closed_at = updated_at, closed_by = 'sistema'"
        " WHERE status IN ('COMPLETED', 'NO_SHOW')"
    )
    # RN-33: a conclusão e a falta sempre registram quando e quem; só elas.
    op.create_check_constraint(
        "ck_appointments_closing",
        "appointments",
        "(status IN ('COMPLETED', 'NO_SHOW')) = (closed_at IS NOT NULL)"
        " AND (closed_at IS NULL) = (closed_by IS NULL)",
    )
    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("appointment_id", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("method", sa.String(length=20), nullable=False),
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
            "method IN ('CASH', 'PIX', 'DEBIT', 'CREDIT')", name="ck_payments_method"
        ),
        # RN-40: o valor cobrado é maior ou igual a zero (zero = cortesia).
        sa.CheckConstraint("amount >= 0", name="ck_payments_amount_non_negative"),
        sa.ForeignKeyConstraint(["appointment_id"], ["appointments.id"]),
        sa.PrimaryKeyConstraint("id"),
        # Um pagamento por agendamento.
        sa.UniqueConstraint("appointment_id"),
    )


def downgrade() -> None:
    op.drop_table("payments")
    op.drop_constraint("ck_appointments_closing", "appointments", type_="check")
    op.drop_column("appointments", "closed_by")
    op.drop_column("appointments", "closed_at")
