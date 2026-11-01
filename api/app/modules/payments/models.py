"""Tabela de pagamentos (RN-40, RN-41, RN-42)."""

from datetime import datetime
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import CheckConstraint, DateTime, Enum, ForeignKey, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class PaymentMethod(StrEnum):
    """RN-40: dinheiro, Pix, débito ou crédito."""

    CASH = "CASH"
    PIX = "PIX"
    DEBIT = "DEBIT"
    CREDIT = "CREDIT"


def _method_check() -> str:
    listed = ", ".join(f"'{value}'" for value in PaymentMethod)
    return f"method IN ({listed})"


class Payment(Base):
    """O registro da conclusão: o valor cobrado e a forma de pagamento.

    Existe só para agendamento `COMPLETED` e no máximo um por agendamento. O
    valor conta para o barbeiro do agendamento (RN-42).
    """

    __tablename__ = "payments"
    __table_args__ = (
        CheckConstraint(_method_check(), name="ck_payments_method"),
        # RN-40: o valor cobrado é maior ou igual a zero (zero = cortesia).
        CheckConstraint("amount >= 0", name="ck_payments_amount_non_negative"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    # `unique`: um pagamento por agendamento, mesmo com duas conclusões juntas.
    appointment_id: Mapped[int] = mapped_column(
        ForeignKey("appointments.id"), unique=True
    )
    # Dinheiro em numeric(10,2), nunca float.
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    # Texto com os nomes do enum, sem tipo nativo: valor novo = migração do CHECK.
    method: Mapped[PaymentMethod] = mapped_column(
        Enum(
            PaymentMethod,
            native_enum=False,
            create_constraint=False,
            length=20,
            validate_strings=True,
        )
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    # RN-41: quando o pagamento foi corrigido pela última vez.
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
