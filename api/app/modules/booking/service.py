"""Regras do agendamento pelo cliente (RN-05 a RN-16, RN-31 a RN-33).

Criar (S3.08), listar, cancelar e remarcar (S3.09) os próprios agendamentos.
Criar, cancelar e remarcar avisam o cliente por e-mail (RN-50, RN-52, S5.03).
"""

from dataclasses import dataclass
from datetime import date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

from app.errors import DomainError
from app.modules.appointments.models import (
    Appointment,
    AppointmentSource,
    AppointmentStatus,
    CanceledBy,
)
from app.modules.appointments.service import (
    can_change_at,
    is_late_change,
    is_slot_conflict,
)
from app.modules.availability.service import (
    Rescheduling,
    ensure_slot_available,
    list_available_days,
    list_available_slots,
    slot_unavailable,
)
from app.modules.availability.slots import TimeRange
from app.modules.barbers.models import Barber
from app.modules.barbers.service import get_barber
from app.modules.catalog.models import Service
from app.modules.catalog.service import get_service
from app.modules.customers.models import Customer
from app.modules.notifications.models import NotificationKind
from app.modules.notifications.service import Outbox, notify

# RN-11: no máximo 2 agendamentos ativos no futuro por cliente.
MAX_ACTIVE_APPOINTMENTS = 2


@dataclass(frozen=True, slots=True)
class CustomerAppointment:
    """O agendamento com o barbeiro e o serviço, para a resposta da API."""

    appointment: Appointment
    barber: Barber
    service: Service


@dataclass(frozen=True, slots=True)
class CustomerChange:
    """Um cancelamento ou uma remarcação, e se foi em cima da hora (RN-14):
    nas 2 horas antes do horário que o cliente deixou."""

    booked: CustomerAppointment
    late: bool


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

    `FOR NO KEY UPDATE`, e não `FOR UPDATE`: a chave estrangeira de um
    agendamento da administração para o mesmo cliente não espera esta trava.
    Se esperasse, essa reserva seguraria o dia (`FOR SHARE`) esperando o
    cliente, o cliente esperaria o dia travado por uma edição do expediente
    (RN-02) e a edição esperaria o dia da reserva: um deadlock.
    """
    customer = session.get(
        Customer,
        customer_id,
        with_for_update={"key_share": True},
        populate_existing=True,
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
    outbox: Outbox,
) -> CustomerAppointment:
    """Cria o agendamento do próprio cliente (RN-16), numa transação:

    1. RN-10: o cliente tem telefone no cadastro;
    2. RN-11: tem menos de 2 agendamentos ativos no futuro;
    3. RN-05 e RN-13: trava o serviço, para a duração conferida ser a gravada;
    4. RN-05 a RN-07: `starts_at` é um dos horários disponíveis, com a política
       do cliente (`ensure_slot_available`, que trava o barbeiro);
    5. RN-12: nasce `SCHEDULED`, com origem `ONLINE`;
    6. RN-13: guarda o preço e a duração do serviço neste momento;
    7. RN-08: se outra reserva ficou com o horário ao mesmo tempo, o banco
       recusa e a resposta é a mesma do horário indisponível;
    8. RN-50: registra o e-mail de confirmação na mesma transação e o envia
       depois do commit. Uma falha no envio não desfaz nada (RN-54).
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
    service = get_service(session, service_id, lock=True)
    ensure_slot_available(
        session,
        barber_id=barber_id,
        service_id=service_id,
        starts_at=starts_at,
        now=now,
    )
    barber = get_barber(session, barber_id)
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
        # RN-08: a leitura do cliente em notify pode descarregar a reserva.
        notification = notify(session, appointment, NotificationKind.CONFIRMATION)
        session.commit()
    except DBAPIError as error:
        session.rollback()
        if is_slot_conflict(error):
            raise slot_unavailable() from error
        raise
    outbox.send_after_commit(notification)
    return CustomerAppointment(appointment=appointment, barber=barber, service=service)


# Listar, cancelar e remarcar (S3.09).


def change_deadline(appointment: Appointment) -> datetime | None:
    """RN-14: até quando o cliente pode cancelar ou remarcar: o início. Só o
    agendamento ativo (RN-31) tem prazo."""
    if appointment.status != AppointmentStatus.SCHEDULED:
        return None
    return appointment.starts_at


def can_change(appointment: Appointment, now: datetime) -> bool:
    """RN-14 e RN-31: ativo e com o início ainda por vir."""
    return appointment.status == AppointmentStatus.SCHEDULED and can_change_at(
        appointment.starts_at, now
    )


def late_change(appointment: Appointment, now: datetime) -> bool:
    """RN-14: alterar agora é em cima da hora (nas 2 horas antes do início). A
    tela mostra o aviso, mas a ação continua permitida."""
    return can_change(appointment, now) and is_late_change(appointment.starts_at, now)


def _with_relations(session: Session, appointment: Appointment) -> CustomerAppointment:
    return CustomerAppointment(
        appointment=appointment,
        barber=get_barber(session, appointment.barber_id),
        service=get_service(session, appointment.service_id),
    )


def list_customer_appointments(
    session: Session, customer_id: int, now: datetime
) -> tuple[list[CustomerAppointment], list[CustomerAppointment]]:
    """RN-16: só os agendamentos do próprio cliente, em próximos e histórico.

    Próximos são os `SCHEDULED` que ainda não terminaram (o mesmo "ativo no
    futuro" da RN-11), do mais próximo ao mais distante. O histórico tem todos
    os outros, do mais recente ao mais antigo.
    """
    rows = session.execute(
        select(Appointment, Barber, Service)
        .join(Barber, Barber.id == Appointment.barber_id)
        .join(Service, Service.id == Appointment.service_id)
        .where(Appointment.customer_id == customer_id)
        .order_by(Appointment.starts_at, Appointment.id)
    ).all()
    upcoming: list[CustomerAppointment] = []
    history: list[CustomerAppointment] = []
    for appointment, barber, service in rows:
        item = CustomerAppointment(
            appointment=appointment, barber=barber, service=service
        )
        is_upcoming = (
            appointment.status == AppointmentStatus.SCHEDULED
            and appointment.ends_at > now
        )
        (upcoming if is_upcoming else history).append(item)
    history.reverse()
    return upcoming, history


def _owned_appointment(
    session: Session, customer_id: int, appointment_id: int, *, lock: bool = False
) -> Appointment:
    """RN-16: o agendamento só é encontrado pelo próprio cliente. O de outro
    cliente responde como inexistente, para não revelar que ele existe.

    Com `lock`, trava a linha até o fim da transação e relê o status: dois
    pedidos do mesmo agendamento (cancelar e remarcar, por exemplo) passam um
    depois do outro.
    """
    query = select(Appointment).where(
        Appointment.id == appointment_id, Appointment.customer_id == customer_id
    )
    if lock:
        query = query.with_for_update().execution_options(populate_existing=True)
    appointment = session.scalars(query).one_or_none()
    if appointment is None:
        raise DomainError(
            code="APPOINTMENT_NOT_FOUND",
            message="Agendamento não encontrado.",
            status_code=404,
        )
    return appointment


def get_customer_appointment(
    session: Session, customer_id: int, appointment_id: int
) -> CustomerAppointment:
    return _with_relations(
        session, _owned_appointment(session, customer_id, appointment_id)
    )


def _ensure_changeable(appointment: Appointment, now: datetime) -> None:
    """RN-31: só o agendamento ativo muda; RN-14: até o início."""
    if appointment.status != AppointmentStatus.SCHEDULED:
        raise DomainError(
            code="APPOINTMENT_NOT_ACTIVE",
            message="Este agendamento não está mais ativo.",
            status_code=409,
        )
    if not can_change(appointment, now):
        raise DomainError(
            code="CHANGE_DEADLINE_PASSED",
            message=(
                "Seu horário já começou. Se você está a caminho ou não vai "
                "conseguir vir, fale com a barbearia."
            ),
            status_code=409,
        )


def cancel_customer_appointment(
    session: Session,
    customer_id: int,
    appointment_id: int,
    now: datetime,
    *,
    outbox: Outbox,
) -> CustomerChange:
    """O cliente cancela o próprio agendamento até o início (RN-14, RN-16,
    RN-31). Nas últimas 2 horas, o cancelamento é em cima da hora: a resposta
    diz isso, para a tela agradecer o aviso.

    Registra quando foi e que foi o cliente (RN-33). A vaga fica livre na hora
    (RN-32): a exclusion constraint da RN-08 só considera `SCHEDULED`. O aviso
    por e-mail (RN-52) é registrado junto e enviado depois do commit.
    """
    appointment = _owned_appointment(session, customer_id, appointment_id, lock=True)
    _ensure_changeable(appointment, now)
    late = is_late_change(appointment.starts_at, now)
    appointment.status = AppointmentStatus.CANCELED
    appointment.canceled_at = now
    appointment.canceled_by = CanceledBy.CUSTOMER
    notification = notify(session, appointment, NotificationKind.CANCELED)
    session.commit()
    outbox.send_after_commit(notification)
    return CustomerChange(_with_relations(session, appointment), late)


def _rescheduling(appointment: Appointment) -> Rescheduling:
    return Rescheduling(
        appointment_id=appointment.id,
        barber_id=appointment.barber_id,
        starts_at=appointment.starts_at,
        duration=timedelta(minutes=appointment.duration_minutes),
    )


def reschedule_customer_appointment(
    session: Session,
    customer_id: int,
    appointment_id: int,
    *,
    starts_at: datetime,
    barber_id: int | None,
    now: datetime,
    outbox: Outbox,
) -> CustomerChange:
    """O cliente remarca o próprio agendamento (RN-14, RN-15, RN-31), numa
    transação:

    1. trava o agendamento e confere o status e o prazo, sobre o horário atual
       (até o início; nas últimas 2 horas, a remarcação é em cima da hora);
    2. sem `barber_id`, o barbeiro continua o mesmo; o serviço nunca muda;
    3. RN-05 a RN-07: o novo início é um dos horários oferecidos para o serviço
       com o barbeiro, com a duração congelada (RN-13). O próprio agendamento
       não ocupa a agenda, então o novo horário pode cruzar o atual;
    4. atualiza a mesma linha: o preço e a duração continuam os da criação;
    5. RN-08: se outra reserva ficou com o horário ao mesmo tempo, o banco
       recusa e o agendamento continua no horário antigo;
    6. RN-52: o aviso por e-mail, com o novo horário, é registrado na mesma
       transação e enviado depois do commit.
    """
    appointment = _owned_appointment(session, customer_id, appointment_id, lock=True)
    _ensure_changeable(appointment, now)
    late = is_late_change(appointment.starts_at, now)
    new_barber_id = appointment.barber_id if barber_id is None else barber_id
    if new_barber_id == appointment.barber_id and starts_at == appointment.starts_at:
        raise DomainError(
            code="SAME_SLOT",
            message="Este já é o horário do seu agendamento. Escolha outro.",
            status_code=409,
        )
    ensure_slot_available(
        session,
        barber_id=new_barber_id,
        service_id=appointment.service_id,
        starts_at=starts_at,
        now=now,
        rescheduling=_rescheduling(appointment),
    )
    appointment.barber_id = new_barber_id
    appointment.starts_at = starts_at
    appointment.ends_at = starts_at + timedelta(minutes=appointment.duration_minutes)
    try:
        # RN-08: a leitura do cliente em notify pode descarregar a reserva.
        notification = notify(session, appointment, NotificationKind.RESCHEDULED)
        session.commit()
    except DBAPIError as error:
        session.rollback()
        if is_slot_conflict(error):
            raise slot_unavailable() from error
        raise
    outbox.send_after_commit(notification)
    return CustomerChange(_with_relations(session, appointment), late)


@dataclass(frozen=True, slots=True)
class RescheduleTarget:
    """O que a remarcação consulta: o barbeiro escolhido e o serviço."""

    barber_id: int
    service_id: int
    rescheduling: Rescheduling


def _reschedule_target(
    session: Session,
    customer_id: int,
    appointment_id: int,
    barber_id: int | None,
    now: datetime,
) -> RescheduleTarget:
    appointment = _owned_appointment(session, customer_id, appointment_id)
    _ensure_changeable(appointment, now)
    return RescheduleTarget(
        barber_id=appointment.barber_id if barber_id is None else barber_id,
        service_id=appointment.service_id,
        rescheduling=_rescheduling(appointment),
    )


def reschedule_days(
    session: Session,
    customer_id: int,
    appointment_id: int,
    *,
    barber_id: int | None,
    now: datetime,
) -> tuple[RescheduleTarget, list[date]]:
    """Os dias com horário para remarcar (RN-05 a RN-07, RN-15)."""
    target = _reschedule_target(session, customer_id, appointment_id, barber_id, now)
    days = list_available_days(
        session,
        barber_id=target.barber_id,
        service_id=target.service_id,
        now=now,
        rescheduling=target.rescheduling,
    )
    return target, days


def reschedule_slots(
    session: Session,
    customer_id: int,
    appointment_id: int,
    *,
    barber_id: int | None,
    day: date,
    now: datetime,
) -> tuple[RescheduleTarget, list[TimeRange]]:
    """Os horários de `day` para remarcar (RN-05 a RN-07, RN-15)."""
    target = _reschedule_target(session, customer_id, appointment_id, barber_id, now)
    slots = list_available_slots(
        session,
        barber_id=target.barber_id,
        service_id=target.service_id,
        day=day,
        now=now,
        rescheduling=target.rescheduling,
    )
    return target, slots
