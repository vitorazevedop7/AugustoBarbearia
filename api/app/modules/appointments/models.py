"""Tabela de agendamentos (RN-08, RN-13, RN-30, RN-33)."""

from datetime import datetime
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    func,
    literal_column,
    text,
)
from sqlalchemy.dialects.postgresql import TSTZRANGE, ExcludeConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class AppointmentStatus(StrEnum):
    """RN-30. Só `SCHEDULED` é ativo e ocupa a agenda (RN-08)."""

    SCHEDULED = "SCHEDULED"
    COMPLETED = "COMPLETED"
    CANCELED = "CANCELED"
    NO_SHOW = "NO_SHOW"


class AppointmentSource(StrEnum):
    """Quem criou o agendamento: o cliente pelo site ou a administração."""

    ONLINE = "ONLINE"
    ADMIN = "ADMIN"


class CanceledBy(StrEnum):
    """RN-33: quem cancelou."""

    CUSTOMER = "CUSTOMER"
    ADMIN = "ADMIN"


# Nome da exclusion constraint da RN-08. A criação (S3.08) usa o nome para
# reconhecer a violação e responder "horário não está mais disponível".
OVERLAP_CONSTRAINT = "ex_appointments_barber_overlap"

# Um e-mail tem no máximo 320 caracteres (RFC 5321).
CLOSED_BY_MAX_LENGTH = 320


def _values_check(column: str, values: type[StrEnum]) -> str:
    listed = ", ".join(f"'{value}'" for value in values)
    return f"{column} IN ({listed})"


def _enum_column(enum: type[StrEnum]) -> Enum:
    """Texto com os nomes do enum, sem tipo nativo do Postgres: um valor novo
    é só uma migração do `CHECK`."""
    return Enum(
        enum,
        native_enum=False,
        create_constraint=False,
        length=20,
        validate_strings=True,
    )


class Appointment(Base):
    __tablename__ = "appointments"
    __table_args__ = (
        CheckConstraint(
            _values_check("status", AppointmentStatus), name="ck_appointments_status"
        ),
        CheckConstraint(
            _values_check("source", AppointmentSource), name="ck_appointments_source"
        ),
        CheckConstraint(
            _values_check("canceled_by", CanceledBy),
            name="ck_appointments_canceled_by",
        ),
        # RN-33: o cancelamento sempre registra quando e quem; só ele registra.
        CheckConstraint(
            "(status = 'CANCELED') = (canceled_at IS NOT NULL)"
            " AND (canceled_at IS NULL) = (canceled_by IS NULL)",
            name="ck_appointments_cancellation",
        ),
        # RN-33: a conclusão e a falta sempre registram quando e quem; só elas.
        CheckConstraint(
            "(status IN ('COMPLETED', 'NO_SHOW')) = (closed_at IS NOT NULL)"
            " AND (closed_at IS NULL) = (closed_by IS NULL)",
            name="ck_appointments_closing",
        ),
        # RN-13: preço e duração congelados; o fim é sempre início + duração.
        CheckConstraint("price >= 0", name="ck_appointments_price_non_negative"),
        CheckConstraint("duration_minutes > 0", name="ck_appointments_duration"),
        CheckConstraint(
            "ends_at = starts_at + make_interval(mins => duration_minutes)",
            name="ck_appointments_ends_at",
        ),
        # RN-08: dois agendamentos ativos do mesmo barbeiro nunca se cruzam.
        # O intervalo é [início, fim): encostar no fim do anterior é permitido.
        ExcludeConstraint(
            ("barber_id", "="),
            (literal_column("tstzrange(starts_at, ends_at, '[)')", TSTZRANGE()), "&&"),
            name=OVERLAP_CONSTRAINT,
            using="gist",
            where=text("status = 'SCHEDULED'"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), index=True)
    barber_id: Mapped[int] = mapped_column(ForeignKey("barbers.id"))
    service_id: Mapped[int] = mapped_column(ForeignKey("services.id"))
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    # RN-13: cópias do serviço no momento da criação. Dinheiro em numeric(10,2).
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    duration_minutes: Mapped[int] = mapped_column(Integer)
    # RN-12: o agendamento nasce confirmado.
    status: Mapped[AppointmentStatus] = mapped_column(
        _enum_column(AppointmentStatus),
        default=AppointmentStatus.SCHEDULED,
        server_default=AppointmentStatus.SCHEDULED.value,
    )
    source: Mapped[AppointmentSource] = mapped_column(_enum_column(AppointmentSource))
    canceled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    canceled_by: Mapped[CanceledBy | None] = mapped_column(_enum_column(CanceledBy))
    # RN-33: quando e por quem foi concluído ou marcado como falta. `closed_by` é
    # o e-mail da conta da administração que fez; `null` nos outros status.
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    closed_by: Mapped[str | None] = mapped_column(String(CLOSED_BY_MAX_LENGTH))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
