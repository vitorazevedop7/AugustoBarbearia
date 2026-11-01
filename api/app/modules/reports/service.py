"""Regras do relatório financeiro (RN-01, RN-42, RN-43, RN-44, RN-70).

- RN-01: o período são dias de São Paulo, convertidos para UTC só na consulta;
- o atendimento pertence ao dia em que **começa** (`starts_at`), como na agenda;
- só `COMPLETED` entra no faturamento, com o valor cobrado do `Payment`
  (RN-40, RN-41, RN-44); `NO_SHOW` só na contagem de faltas;
- RN-42: o valor conta para o barbeiro do agendamento;
- os totais saem da própria lista dos concluídos, em `Decimal`; nada passa por
  `float`.
"""

from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import ColumnElement, func, select
from sqlalchemy.orm import Session

from app.errors import DomainError
from app.modules.agenda.service import period_bounds
from app.modules.appointments.models import Appointment, AppointmentStatus
from app.modules.barbers.models import Barber
from app.modules.barbers.service import get_barber
from app.modules.catalog.models import Service
from app.modules.customers.models import Customer
from app.modules.payments.models import Payment, PaymentMethod

# Um ano, inclusive em ano bissexto: mantém a lista dos concluídos num tamanho
# razoável, já que ela não é paginada.
MAX_PERIOD_DAYS = 366

ZERO = Decimal("0.00")


@dataclass(frozen=True, slots=True)
class BarberTotals:
    barber: Barber
    total: Decimal
    completed_count: int
    no_show_count: int


@dataclass(frozen=True, slots=True)
class MethodTotals:
    method: PaymentMethod
    total: Decimal
    count: int


@dataclass(frozen=True, slots=True)
class CompletedRow:
    appointment: Appointment
    customer: Customer
    barber: Barber
    service: Service
    payment: Payment


@dataclass(frozen=True, slots=True)
class FinancialReport:
    total: Decimal
    completed_count: int
    no_show_count: int
    by_barber: list[BarberTotals]
    by_method: list[MethodTotals]
    completed: list[CompletedRow]


def check_period(start: date, end: date) -> None:
    """RN-43: o período é obrigatório, `start` ≤ `end`, e tem no máximo 366 dias.
    O último dia do calendário não tem "dia seguinte" para fechar o período."""
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


def _scope(
    status: AppointmentStatus, since: datetime, until: datetime, barber_id: int | None
) -> list[ColumnElement[bool]]:
    """RN-01 e RN-42: o status, o início dentro do período e, se pedido, o
    barbeiro do agendamento."""
    conditions = [
        Appointment.status == status,
        Appointment.starts_at >= since,
        Appointment.starts_at < until,
    ]
    if barber_id is not None:
        conditions.append(Appointment.barber_id == barber_id)
    return conditions


def financial_report(
    session: Session, *, start: date, end: date, barber_id: int | None = None
) -> FinancialReport:
    """O relatório do período para a administração (RN-43, RN-70).

    Com `barber_id`, só aquele barbeiro, ativo ou não (`404 BARBER_NOT_FOUND` se
    não existir). Sem filtro, entram os barbeiros ativos e os inativos que
    tenham concluído ou falta no período.

    O faturamento, a contagem e os totais por barbeiro e por forma saem da
    **própria lista** dos concluídos, lida numa só consulta: se um pagamento for
    corrigido enquanto o relatório é montado, os números continuam batendo com
    a lista (RN-43). Os valores são `numeric(10,2)` lidos como `Decimal`, então
    a soma em Python é exata; nada passa por `float`.
    """
    check_period(start, end)
    selected = get_barber(session, barber_id) if barber_id is not None else None
    since, until = period_bounds(start, end)
    only = selected.id if selected is not None else None

    completed = [
        CompletedRow(
            appointment=appointment,
            customer=customer,
            barber=barber,
            service=service,
            payment=payment,
        )
        for appointment, customer, barber, service, payment in session.execute(
            select(Appointment, Customer, Barber, Service, Payment)
            .join(Payment, Payment.appointment_id == Appointment.id)
            .join(Customer, Customer.id == Appointment.customer_id)
            .join(Barber, Barber.id == Appointment.barber_id)
            .join(Service, Service.id == Appointment.service_id)
            .where(*_scope(AppointmentStatus.COMPLETED, since, until, only))
            .order_by(Appointment.starts_at, Barber.name, Appointment.id)
        )
    ]

    # RN-43: as faltas do período, por barbeiro.
    no_shows_by_barber = {
        found_id: count
        for found_id, count in session.execute(
            select(Appointment.barber_id, func.count(Appointment.id))
            .where(*_scope(AppointmentStatus.NO_SHOW, since, until, only))
            .group_by(Appointment.barber_id)
        )
    }

    # RN-43: totais por forma de pagamento (as quatro, mesmo com zero).
    method_count = dict.fromkeys(PaymentMethod, 0)
    method_total = dict.fromkeys(PaymentMethod, ZERO)
    # RN-42: totais por barbeiro do agendamento.
    barber_count: dict[int, int] = {}
    barber_total: dict[int, Decimal] = {}
    for row in completed:
        method_count[row.payment.method] += 1
        method_total[row.payment.method] += row.payment.amount
        barber_count[row.barber.id] = barber_count.get(row.barber.id, 0) + 1
        barber_total[row.barber.id] = (
            barber_total.get(row.barber.id, ZERO) + row.payment.amount
        )
    by_method = [
        MethodTotals(
            method=method, total=method_total[method], count=method_count[method]
        )
        for method in PaymentMethod
    ]

    # Os barbeiros da resposta: o filtrado, ou os ativos e os inativos com
    # atendimento no período. A ordem é a do banco (nome, id), como nas outras telas.
    if selected is not None:
        barbers = [selected]
    else:
        with_activity = set(barber_count) | set(no_shows_by_barber)
        barbers = list(
            session.scalars(
                select(Barber)
                .where(Barber.active | Barber.id.in_(with_activity))
                .order_by(Barber.name, Barber.id)
            )
        )
    by_barber = [
        BarberTotals(
            barber=barber,
            total=barber_total.get(barber.id, ZERO),
            completed_count=barber_count.get(barber.id, 0),
            no_show_count=no_shows_by_barber.get(barber.id, 0),
        )
        for barber in barbers
    ]

    return FinancialReport(
        total=sum(method_total.values(), ZERO),
        completed_count=len(completed),
        no_show_count=sum(no_shows_by_barber.values()),
        by_barber=by_barber,
        by_method=by_method,
        completed=completed,
    )
