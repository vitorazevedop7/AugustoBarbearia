"""Regras do agendamento pelo cliente (RN-05 a RN-13, RN-16).

Listar, cancelar e remarcar os próprios agendamentos (S3.09) entram aqui.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

from app.errors import DomainError
from app.modules.appointments.models import (
    Appointment,
    AppointmentSource,
    AppointmentStatus,
)
from app.modules.appointments.service import is_slot_conflict
from app.modules.availability.service import ensure_slot_available, slot_unavailable
from app.modules.barbers.models import Barber
from app.modules.barbers.service import get_barber
from app.modules.catalog.models import Service
from app.modules.catalog.service import get_service
from app.modules.customers.models import Customer

# RN-11: no máximo 2 agendamentos ativos no futuro por cliente.
MAX_ACTIVE_APPOINTMENTS = 2


@dataclass(frozen=True, slots=True)
class CustomerAppointment:
    """O agendamento com o barbeiro e o serviço, para a resposta da API."""

    appointment: Appointment
    barber: Barber
    service: Service


def count_active_appointments(session: Session, customer_id: int, now: datetime) -> int:
    """RN-11: agendamentos `SCHEDULED` do cliente que ainda não terminaram.

    Conta também o que está em andamento (`ends_at > now`), como a RN-60. Um
    `SCHEDULED` que já terminou só espera a conclusão ou a falta, e não conta.
    """
    return (
        session.scalar(
            select(func.count()).where(
                Appointment.customer_id == customer_id,
                Appointment.status == AppointmentStatus.SCHEDULED,
                Appointment.ends_at > now,
            )
        )
        or 0
    )


def _lock_customer(session: Session, customer_id: int) -> Customer:
    """Trava o cliente até o fim da transação e relê o cadastro.

    Dois pedidos simultâneos do mesmo cliente contam os ativos um depois do
    outro, então não passam juntos do limite da RN-11.
    """
    customer = session.get(
        Customer, customer_id, with_for_update=True, populate_existing=True
    )
    if customer is None:
        # O cliente vem do token e já foi resolvido nesta requisição.
        raise LookupError(f"Cliente {customer_id} não existe.")
    return customer


def create_customer_appointment(
    session: Session,
    customer: Customer,
    *,
    barber_id: int,
    service_id: int,
    starts_at: datetime,
    now: datetime,
) -> CustomerAppointment:
    """Cria o agendamento do próprio cliente (RN-16), numa transação:

    1. RN-10: o cliente tem telefone no cadastro;
    2. RN-11: tem menos de 2 agendamentos ativos no futuro;
    3. RN-05 a RN-07: `starts_at` é um dos horários disponíveis, com a política
       do cliente (`ensure_slot_available`, que trava o barbeiro);
    4. RN-12: nasce `SCHEDULED`, com origem `ONLINE`;
    5. RN-13: guarda o preço e a duração do serviço neste momento;
    6. RN-08: se outra reserva ficou com o horário ao mesmo tempo, o banco
       recusa e a resposta é a mesma do horário indisponível.
    """
    customer = _lock_customer(session, customer.id)
    if customer.phone is None:
        raise DomainError(
            code="PHONE_REQUIRED",
            message=(
                "Informe seu telefone para agendar. "
                "A barbearia usa o telefone para falar com você."
            ),
            status_code=409,
        )
    if count_active_appointments(session, customer.id, now) >= MAX_ACTIVE_APPOINTMENTS:
        raise DomainError(
            code="APPOINTMENT_LIMIT_REACHED",
            message=(
                "Você já tem 2 agendamentos marcados, que é o máximo. Para marcar "
                "outro, cancele um deles ou espere o próximo atendimento."
            ),
            status_code=409,
        )
    ensure_slot_available(
        session,
        barber_id=barber_id,
        service_id=service_id,
        starts_at=starts_at,
        now=now,
    )
    barber = get_barber(session, barber_id)
    service = get_service(session, service_id)
    appointment = Appointment(
        customer_id=customer.id,
        barber_id=barber.id,
        service_id=service.id,
        starts_at=starts_at,
        ends_at=starts_at + timedelta(minutes=service.duration_minutes),
        price=service.price,
        duration_minutes=service.duration_minutes,
        status=AppointmentStatus.SCHEDULED,
        source=AppointmentSource.ONLINE,
    )
    session.add(appointment)
    try:
        session.commit()
    except DBAPIError as error:
        session.rollback()
        if is_slot_conflict(error):
            raise slot_unavailable() from error
        raise
    return CustomerAppointment(appointment=appointment, barber=barber, service=service)
