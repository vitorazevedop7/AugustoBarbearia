"""Registro dos e-mails enviados ao cliente (RN-50 a RN-54, ADR 0006)."""

from datetime import datetime
from enum import StrEnum

from sqlalchemy import CheckConstraint, DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.modules.appointments.models import Appointment
from app.modules.customers.models import EMAIL_MAX_LENGTH


class NotificationKind(StrEnum):
    """Por que o e-mail foi enviado. `REMINDER` é do job da RN-51 (S5.08)."""

    CONFIRMATION = "CONFIRMATION"
    REMINDER = "REMINDER"
    RESCHEDULED = "RESCHEDULED"
    CANCELED = "CANCELED"


class NotificationStatus(StrEnum):
    """`PENDING` até o envio depois do commit; então `SENT` ou `FAILED` (RN-54)."""

    PENDING = "PENDING"
    SENT = "SENT"
    FAILED = "FAILED"


def _values_check(column: str, values: type[StrEnum]) -> str:
    listed = ", ".join(f"'{value}'" for value in values)
    return f"{column} IN ({listed})"


def _enum_column(enum: type[StrEnum]) -> Enum:
    """Texto com os nomes do enum, sem tipo nativo do Postgres, como em
    `appointments`."""
    return Enum(
        enum,
        native_enum=False,
        create_constraint=False,
        length=20,
        validate_strings=True,
    )


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        CheckConstraint(
            _values_check("kind", NotificationKind), name="ck_notifications_kind"
        ),
        CheckConstraint(
            _values_check("status", NotificationStatus),
            name="ck_notifications_status",
        ),
        # Só o enviado tem data de envio; só a falha tem erro (RN-54).
        CheckConstraint(
            "(status = 'SENT') = (sent_at IS NOT NULL)",
            name="ck_notifications_sent_at",
        ),
        CheckConstraint(
            "(status = 'FAILED') = (error IS NOT NULL)",
            name="ck_notifications_error",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    appointment_id: Mapped[int] = mapped_column(
        ForeignKey("appointments.id"), index=True
    )
    kind: Mapped[NotificationKind] = mapped_column(_enum_column(NotificationKind))
    # O e-mail do cliente no momento da ação.
    recipient: Mapped[str] = mapped_column(String(EMAIL_MAX_LENGTH))
    status: Mapped[NotificationStatus] = mapped_column(
        _enum_column(NotificationStatus),
        default=NotificationStatus.PENDING,
        server_default=NotificationStatus.PENDING.value,
    )
    error: Mapped[str | None] = mapped_column(Text)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Com a relação, o registro entra na mesma transação de um agendamento
    # ainda não gravado: o insert sai depois do dele.
    appointment: Mapped[Appointment] = relationship()
