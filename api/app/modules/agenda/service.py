"""Regras da agenda da administração (RN-01, RN-02, RN-30, RN-70).

Só leitura: os agendamentos de um período, com a moldura de cada dia, e o
detalhe de um agendamento, com o pagamento quando concluído. Bloqueios e
agendamento manual entram nas próximas issues (S5.04 e S5.05); a conclusão
mora em `payments` (S5.06).
"""

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta

from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.clock import TIMEZONE
from app.errors import DomainError
from app.modules.appointments.models import Appointment
from app.modules.barbers.models import Barber
from app.modules.barbers.service import get_barber, list_active_barbers
from app.modules.catalog.models import Service
from app.modules.customers.models import Customer
from app.modules.payments.models import Payment
from app.modules.shop.service import list_business_hours

# O tamanho da visão da semana: o período pedido tem no máximo 7 dias.
MAX_PERIOD_DAYS = 7


@dataclass(frozen=True, slots=True)
class AgendaEntry:
    """O agendamento com o cliente, o barbeiro, o serviço e, se concluído, o
    pagamento (RN-40), para a resposta."""

    appointment: Appointment
    customer: Customer
    barber: Barber
    service: Service
    payment: Payment | None = None


@dataclass(frozen=True, slots=True)
class AgendaDay:
    """RN-02: o horário de funcionamento de um dia; `None` = fechado."""

    date: date
    opens_at: time | None
    closes_at: time | None


@dataclass(frozen=True, slots=True)
class Agenda:
    days: list[AgendaDay]
    barbers: list[Barber]
    entries: list[AgendaEntry]


def check_period(start: date, end: date) -> None:
    """O período tem as duas datas inclusivas e no máximo 7 dias. O último dia
    do calendário não tem "dia seguinte" para fechar o período."""
    if end >= date.max:
        raise DomainError(
            code="INVALID_PERIOD",
            message="Escolha uma data válida.",
            status_code=422,
        )
    if end < start:
        raise DomainError(
            code="INVALID_PERIOD",
            message="A data final precisa ser igual ou posterior à inicial.",
            status_code=422,
        )
    if (end - start).days >= MAX_PERIOD_DAYS:
        raise DomainError(
            code="INVALID_PERIOD",
            message=f"Escolha um período de até {MAX_PERIOD_DAYS} dias.",
            status_code=422,
        )


def period_bounds(start: date, end: date) -> tuple[datetime, datetime]:
    """RN-01: as datas são dias de São Paulo. O período vai da meia-noite de
    `start` até a meia-noite do dia seguinte a `end`, nesse fuso."""
    return (
        datetime.combine(start, time.min, TIMEZONE),
        datetime.combine(end + timedelta(days=1), time.min, TIMEZONE),
    )


def _days(session: Session, start: date, end: date) -> list[AgendaDay]:
    """RN-02: cada dia recebe o horário do seu dia da semana."""
    hours = {row.weekday: row for row in list_business_hours(session)}
    days: list[AgendaDay] = []
    for offset in range((end - start).days + 1):
        day = start + timedelta(days=offset)
        row = hours.get(day.weekday())
        days.append(
            AgendaDay(
                date=day,
                opens_at=row.opens_at if row else None,
                closes_at=row.closes_at if row else None,
            )
        )
    return days


def _entries_query() -> Select[tuple[Appointment, Customer, Barber, Service, Payment]]:
    # O pagamento é uma junção externa: só o atendimento concluído tem (RN-40);
    # nos outros a coluna vem `None`, o que o `Select` tipado não expressa.
    return (
        select(Appointment, Customer, Barber, Service, Payment)
        .join(Customer, Customer.id == Appointment.customer_id)
        .join(Barber, Barber.id == Appointment.barber_id)
        .join(Service, Service.id == Appointment.service_id)
        .outerjoin(Payment, Payment.appointment_id == Appointment.id)
    )


def _barbers(active: Sequence[Barber], entries: Sequence[AgendaEntry]) -> list[Barber]:
    """Os ativos e os inativos que têm agendamento no período, por nome."""
    found = {barber.id: barber for barber in active}
    for entry in entries:
        found.setdefault(entry.barber.id, entry.barber)
    return sorted(found.values(), key=lambda barber: (barber.name, barber.id))


def list_agenda(
    session: Session, *, start: date, end: date, barber_id: int | None = None
) -> Agenda:
    """A agenda do período para a administração (RN-70).

    - RN-01: entra o agendamento que **começa** num dos dias do período, no
      fuso de São Paulo;
    - RN-30: todos os status, inclusive cancelados e faltas;
    - RN-02: cada dia vem com o horário de funcionamento;
    - com `barber_id`, só aquele barbeiro (`404 BARBER_NOT_FOUND` se não
      existir), ativo ou não.
    """
    check_period(start, end)
    selected = get_barber(session, barber_id) if barber_id is not None else None
    since, until = period_bounds(start, end)
    query = _entries_query().where(
        Appointment.starts_at >= since, Appointment.starts_at < until
    )
    if selected is not None:
        query = query.where(Appointment.barber_id == selected.id)
    rows = session.execute(
        query.order_by(Appointment.starts_at, Barber.name, Appointment.id)
    ).all()
    entries = [
        AgendaEntry(
            appointment=appointment,
            customer=customer,
            barber=barber,
            service=service,
            payment=payment,
        )
        for appointment, customer, barber, service, payment in rows
    ]
    barbers = (
        [selected]
        if selected is not None
        else _barbers(list_active_barbers(session), entries)
    )
    return Agenda(days=_days(session, start, end), barbers=barbers, entries=entries)


def get_admin_appointment(session: Session, appointment_id: int) -> AgendaEntry:
    """Um agendamento de qualquer cliente: a administração vê todos (RN-70)."""
    row = session.execute(
        _entries_query().where(Appointment.id == appointment_id)
    ).first()
    if row is None:
        raise DomainError(
            code="APPOINTMENT_NOT_FOUND",
            message="Agendamento não encontrado.",
            status_code=404,
        )
    appointment, customer, barber, service, payment = row
    return AgendaEntry(
        appointment=appointment,
        customer=customer,
        barber=barber,
        service=service,
        payment=payment,
    )
