"""Regras do agendamento pela administração (RN-13, RN-20 a RN-22, RN-31 a RN-33).

A administração agenda para qualquer cliente, já cadastrado ou novo, com a
política da RN-21 (`ADMIN_POLICY`: sem antecedência mínima, sem janela e sem
limite por cliente), e cancela ou remarca qualquer agendamento ativo sem o
prazo de 2 horas do cliente (RN-22).
"""

from dataclasses import dataclass
from datetime import date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

from app.errors import DomainError
from app.modules.agenda.service import AgendaEntry, get_admin_appointment
from app.modules.appointments.models import (
    Appointment,
    AppointmentSource,
    AppointmentStatus,
    CanceledBy,
)
from app.modules.appointments.service import is_slot_conflict
from app.modules.availability.service import (
    Rescheduling,
    ensure_slot_available,
    list_available_days,
    list_available_slots,
    slot_unavailable,
)
from app.modules.availability.slots import ADMIN_POLICY, TimeRange
from app.modules.catalog.service import get_service
from app.modules.customers.schemas import CustomerCreate
from app.modules.customers.service import (
    create_customer,
    email_taken,
    get_customer,
    is_email_conflict,
)

# O tamanho da lista de dias da tela, a partir de hoje. Não é uma regra: a
# administração não tem janela (RN-21) e consulta qualquer dia pela data.
ADMIN_DAYS_AHEAD = 30


def _commit(session: Session) -> None:
    """Grava a transação. RN-08: se outra reserva ficou com o horário ao mesmo
    tempo, o banco recusa e a resposta é a do horário indisponível; RN-23: o
    e-mail do cliente novo pode ter sido gravado por outro cadastro."""
    try:
        session.commit()
    except DBAPIError as error:
        session.rollback()
        if is_slot_conflict(error):
            raise slot_unavailable() from error
        if is_email_conflict(error):
            raise email_taken() from error
        raise


def create_admin_appointment(
    session: Session,
    *,
    customer_id: int | None,
    new_customer: CustomerCreate | None,
    barber_id: int,
    service_id: int,
    starts_at: datetime,
    now: datetime,
) -> AgendaEntry:
    """Cria o agendamento pela administração, numa transação só:

    1. RN-20: o cliente já cadastrado precisa existir;
    2. RN-21 e RN-05, itens 1 a 5: `starts_at` é um dos horários oferecidos com
       `ADMIN_POLICY` (`ensure_slot_available`, que trava o barbeiro). Sem
       antecedência, é o "encaixe" que começa agora (RN-44). Não há limite
       por cliente (a RN-11 não vale);
    3. RN-20: o cliente novo é criado com `create_customer`, sem `commit`;
    4. RN-31 e RN-13: nasce `SCHEDULED`, com origem `ADMIN`, o preço e a
       duração do serviço neste momento;
    5. RN-08: o `commit` grava o cliente e o agendamento juntos. Se outra
       reserva ganhou o horário, nada fica gravado, nem o cliente novo.
    """
    if customer_id is not None:
        get_customer(session, customer_id)
    ensure_slot_available(
        session,
        barber_id=barber_id,
        service_id=service_id,
        starts_at=starts_at,
        now=now,
        policy=ADMIN_POLICY,
    )
    if new_customer is not None:
        customer_id = create_customer(session, new_customer, commit=False).id
    if customer_id is None:
        # O schema exige um dos dois; aqui só para o tipo.
        raise ValueError("O agendamento precisa de um cliente (RN-20).")
    service = get_service(session, service_id)
    appointment = Appointment(
        customer_id=customer_id,
        barber_id=barber_id,
        service_id=service.id,
        starts_at=starts_at,
        ends_at=starts_at + timedelta(minutes=service.duration_minutes),
        price=service.price,
        duration_minutes=service.duration_minutes,
        status=AppointmentStatus.SCHEDULED,
        source=AppointmentSource.ADMIN,
    )
    session.add(appointment)
    _commit(session)
    return get_admin_appointment(session, appointment.id)


def _locked_appointment(session: Session, appointment_id: int) -> Appointment:
    """Trava o agendamento até o fim da transação e relê o status: dois pedidos
    do mesmo agendamento (cancelar e remarcar, por exemplo) passam um depois do
    outro."""
    appointment = session.scalars(
        select(Appointment)
        .where(Appointment.id == appointment_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    ).one_or_none()
    if appointment is None:
        raise _not_found()
    return appointment


def _not_found() -> DomainError:
    return DomainError(
        code="APPOINTMENT_NOT_FOUND",
        message="Agendamento não encontrado.",
        status_code=404,
    )


def _ensure_active(appointment: Appointment) -> None:
    """RN-22 e RN-31: a administração muda qualquer agendamento ativo
    (`SCHEDULED`), a qualquer momento; os status finais não mudam."""
    if appointment.status != AppointmentStatus.SCHEDULED:
        raise DomainError(
            code="APPOINTMENT_NOT_ACTIVE",
            message="Este agendamento não está mais ativo.",
            status_code=409,
        )


def cancel_admin_appointment(
    session: Session, appointment_id: int, now: datetime
) -> AgendaEntry:
    """A administração cancela qualquer agendamento ativo, sem prazo (RN-22,
    RN-31), inclusive o que já começou. Registra quando foi e que foi a
    administração (RN-33). A vaga fica livre na hora (RN-32): a exclusion
    constraint da RN-08 só considera `SCHEDULED`."""
    appointment = _locked_appointment(session, appointment_id)
    _ensure_active(appointment)
    appointment.status = AppointmentStatus.CANCELED
    appointment.canceled_at = now
    appointment.canceled_by = CanceledBy.ADMIN
    session.commit()
    return get_admin_appointment(session, appointment.id)


def _rescheduling(appointment: Appointment) -> Rescheduling:
    return Rescheduling(
        appointment_id=appointment.id,
        barber_id=appointment.barber_id,
        starts_at=appointment.starts_at,
        duration=timedelta(minutes=appointment.duration_minutes),
    )


def reschedule_admin_appointment(
    session: Session,
    appointment_id: int,
    *,
    starts_at: datetime,
    barber_id: int | None,
    now: datetime,
) -> AgendaEntry:
    """A administração remarca qualquer agendamento ativo, sem prazo (RN-22,
    RN-15, RN-31), numa transação:

    1. trava o agendamento e confere o status;
    2. sem `barber_id`, o barbeiro continua o mesmo; o serviço nunca muda;
    3. RN-21: o novo início é um dos horários oferecidos com `ADMIN_POLICY`,
       com a duração congelada (RN-13). O próprio agendamento não ocupa a
       agenda, então o novo horário pode cruzar o atual;
    4. atualiza a mesma linha: preço, duração e origem continuam os da criação;
    5. RN-08: se outra reserva ficou com o horário ao mesmo tempo, o banco
       recusa e o agendamento continua no horário antigo.
    """
    appointment = _locked_appointment(session, appointment_id)
    _ensure_active(appointment)
    new_barber_id = appointment.barber_id if barber_id is None else barber_id
    if new_barber_id == appointment.barber_id and starts_at == appointment.starts_at:
        raise DomainError(
            code="SAME_SLOT",
            message="Este já é o horário do agendamento. Escolha outro.",
            status_code=409,
        )
    ensure_slot_available(
        session,
        barber_id=new_barber_id,
        service_id=appointment.service_id,
        starts_at=starts_at,
        now=now,
        policy=ADMIN_POLICY,
        rescheduling=_rescheduling(appointment),
    )
    appointment.barber_id = new_barber_id
    appointment.starts_at = starts_at
    appointment.ends_at = starts_at + timedelta(minutes=appointment.duration_minutes)
    _commit(session)
    return get_admin_appointment(session, appointment.id)


# Horários com a política da administração (RN-21).


def admin_slots(
    session: Session, *, barber_id: int, service_id: int, day: date, now: datetime
) -> list[TimeRange]:
    """RN-21: os horários de `day` para um agendamento novo da administração."""
    return list_available_slots(
        session,
        barber_id=barber_id,
        service_id=service_id,
        day=day,
        now=now,
        policy=ADMIN_POLICY,
    )


def admin_days(
    session: Session, *, barber_id: int, service_id: int, now: datetime
) -> list[date]:
    """RN-21: os dias de hoje até hoje + `ADMIN_DAYS_AHEAD` com horário."""
    return list_available_days(
        session,
        barber_id=barber_id,
        service_id=service_id,
        now=now,
        policy=ADMIN_POLICY,
        days_ahead=ADMIN_DAYS_AHEAD,
    )


@dataclass(frozen=True, slots=True)
class RescheduleTarget:
    """O que a remarcação consulta: o barbeiro escolhido e o serviço."""

    barber_id: int
    service_id: int
    rescheduling: Rescheduling


def _reschedule_target(
    session: Session, appointment_id: int, barber_id: int | None
) -> RescheduleTarget:
    appointment = session.get(Appointment, appointment_id)
    if appointment is None:
        raise _not_found()
    _ensure_active(appointment)
    return RescheduleTarget(
        barber_id=appointment.barber_id if barber_id is None else barber_id,
        service_id=appointment.service_id,
        rescheduling=_rescheduling(appointment),
    )


def reschedule_days(
    session: Session,
    appointment_id: int,
    *,
    barber_id: int | None,
    now: datetime,
) -> tuple[RescheduleTarget, list[date]]:
    """Os dias com horário para remarcar (RN-15, RN-21, RN-22)."""
    target = _reschedule_target(session, appointment_id, barber_id)
    days = list_available_days(
        session,
        barber_id=target.barber_id,
        service_id=target.service_id,
        now=now,
        policy=ADMIN_POLICY,
        rescheduling=target.rescheduling,
        days_ahead=ADMIN_DAYS_AHEAD,
    )
    return target, days


def reschedule_slots(
    session: Session,
    appointment_id: int,
    *,
    barber_id: int | None,
    day: date,
    now: datetime,
) -> tuple[RescheduleTarget, list[TimeRange]]:
    """Os horários de `day` para remarcar (RN-15, RN-21, RN-22)."""
    target = _reschedule_target(session, appointment_id, barber_id)
    slots = list_available_slots(
        session,
        barber_id=target.barber_id,
        service_id=target.service_id,
        day=day,
        now=now,
        policy=ADMIN_POLICY,
        rescheduling=target.rescheduling,
    )
    return target, slots
