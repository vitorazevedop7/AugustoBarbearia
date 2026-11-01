"""Carrega os dados do banco e chama o cálculo puro (RN-05)."""

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta

from sqlalchemy import exists, select
from sqlalchemy.orm import Session

from app.clock import TIMEZONE
from app.errors import DomainError
from app.modules.appointments.models import Appointment, AppointmentStatus
from app.modules.availability.slots import (
    CUSTOMER_POLICY,
    BookingPolicy,
    Offer,
    OpeningHours,
    TimeRange,
    available_slots,
    opening_range,
    within_window,
)
from app.modules.barbers.models import Barber
from app.modules.barbers.service import get_barber
from app.modules.catalog.models import BarberService, Service
from app.modules.catalog.service import get_service
from app.modules.shop.service import get_business_hours
from app.modules.time_blocks.models import TimeBlock


@dataclass(frozen=True, slots=True)
class Rescheduling:
    """O agendamento que está sendo remarcado (RN-15).

    Ele não ocupa a própria agenda (o novo horário pode cruzar o atual), a
    duração é a congelada na criação (RN-13) e o início atual com o mesmo
    barbeiro não é oferecido de novo.
    """

    appointment_id: int
    barber_id: int
    starts_at: datetime
    duration: timedelta

    def is_current(self, barber_id: int, slot: TimeRange) -> bool:
        return barber_id == self.barber_id and slot.start == self.starts_at


def _offer(
    session: Session,
    barber: Barber,
    service: Service,
    rescheduling: Rescheduling | None = None,
) -> Offer:
    """RN-05, item 5: os dois ativos e o barbeiro realiza o serviço (RN-61).

    Na remarcação, a duração é a do agendamento, não a do cadastro (RN-13).
    """
    performs = session.scalar(
        select(
            exists().where(
                BarberService.barber_id == barber.id,
                BarberService.service_id == service.id,
            )
        )
    )
    duration = (
        rescheduling.duration
        if rescheduling is not None
        else timedelta(minutes=service.duration_minutes)
    )
    return Offer(
        duration=duration,
        barber_active=barber.active,
        service_active=service.active,
        barber_performs_service=bool(performs),
    )


def _opening_hours(session: Session, day: date) -> OpeningHours | None:
    """RN-02: o horário do dia da semana; `None` quando fechado."""
    return _opening_hours_of(session, day.weekday())


def _opening_hours_of(session: Session, weekday: int) -> OpeningHours | None:
    row = get_business_hours(session, weekday)
    if row is None or row.opens_at is None or row.closes_at is None:
        return None
    return OpeningHours(opens_at=row.opens_at, closes_at=row.closes_at)


def _busy(
    session: Session,
    barber_id: int,
    window: TimeRange,
    rescheduling: Rescheduling | None = None,
) -> list[TimeRange]:
    """Intervalos ocupados do barbeiro que cruzam `window`.

    RN-05, itens 3 e 4: os agendamentos ativos (RN-08, só `SCHEDULED`) e os
    bloqueios (RN-03). Na remarcação, o próprio agendamento não conta como
    ocupado.
    """
    appointments = select(Appointment.starts_at, Appointment.ends_at).where(
        Appointment.barber_id == barber_id,
        Appointment.status == AppointmentStatus.SCHEDULED,
        Appointment.starts_at < window.end,
        Appointment.ends_at > window.start,
    )
    if rescheduling is not None:
        appointments = appointments.where(Appointment.id != rescheduling.appointment_id)
    blocks = select(TimeBlock.starts_at, TimeBlock.ends_at).where(
        TimeBlock.barber_id == barber_id,
        TimeBlock.starts_at < window.end,
        TimeBlock.ends_at > window.start,
    )
    rows = [*session.execute(appointments).all(), *session.execute(blocks).all()]
    return [TimeRange(starts_at, ends_at) for starts_at, ends_at in rows]


def _slots(
    *,
    day: date,
    hours: OpeningHours | None,
    offer: Offer,
    busy: list[TimeRange],
    barber_id: int,
    now: datetime,
    policy: BookingPolicy,
    rescheduling: Rescheduling | None,
) -> list[TimeRange]:
    """A função pura, sem o horário atual do agendamento que está sendo
    remarcado."""
    slots = available_slots(
        day=day, hours=hours, offer=offer, busy=busy, now=now, policy=policy
    )
    if rescheduling is None:
        return slots
    return [slot for slot in slots if not rescheduling.is_current(barber_id, slot)]


def list_available_slots(
    session: Session,
    *,
    barber_id: int,
    service_id: int,
    day: date,
    now: datetime,
    policy: BookingPolicy = CUSTOMER_POLICY,
    rescheduling: Rescheduling | None = None,
) -> list[TimeRange]:
    """RN-05: os horários disponíveis de `day` (data local de São Paulo).

    Barbeiro ou serviço inexistente responde 404; inativo, ou barbeiro que não
    realiza o serviço, não tem horário nenhum. `rescheduling` calcula os
    horários para remarcar um agendamento (RN-15).
    """
    barber = get_barber(session, barber_id)
    service = get_service(session, service_id)
    hours = _opening_hours(session, day)
    # Dia fechado ou fora da janela: não há o que consultar.
    if hours is None or not within_window(day, now, policy):
        return []
    return _slots(
        day=day,
        hours=hours,
        offer=_offer(session, barber, service, rescheduling),
        busy=_busy(session, barber.id, opening_range(day, hours), rescheduling),
        barber_id=barber.id,
        now=now,
        policy=policy,
        rescheduling=rescheduling,
    )


def list_available_days(
    session: Session,
    *,
    barber_id: int,
    service_id: int,
    now: datetime,
    policy: BookingPolicy = CUSTOMER_POLICY,
    rescheduling: Rescheduling | None = None,
    days_ahead: int | None = None,
) -> list[date]:
    """RN-05 a RN-07: os dias da janela que têm pelo menos um horário disponível.

    Usa a mesma função pura de `list_available_slots`, dia a dia, mas lê o
    expediente, a oferta e os ocupados uma vez só para a janela inteira. A
    lista vai de hoje até hoje + `days_ahead`; sem ele, até o fim da janela da
    política (RN-07). A política sem janela (RN-21) precisa de `days_ahead`,
    que aí é só o tamanho da lista, não uma regra.
    """
    days_ahead = policy.max_days_ahead if days_ahead is None else days_ahead
    if days_ahead is None:
        raise ValueError("A lista de dias precisa de um tamanho (RN-07).")
    barber = get_barber(session, barber_id)
    service = get_service(session, service_id)
    offer = _offer(session, barber, service, rescheduling)
    if not offer.bookable:
        return []
    today = now.astimezone(TIMEZONE).date()
    days = [today + timedelta(days=offset) for offset in range(days_ahead + 1)]
    hours = {weekday: _opening_hours_of(session, weekday) for weekday in range(7)}
    window = TimeRange(
        datetime.combine(today, time.min, tzinfo=TIMEZONE),
        datetime.combine(days[-1] + timedelta(days=1), time.min, tzinfo=TIMEZONE),
    )
    busy = _busy(session, barber.id, window, rescheduling)
    return [
        day
        for day in days
        if _slots(
            day=day,
            hours=hours[day.weekday()],
            offer=offer,
            busy=busy,
            barber_id=barber.id,
            now=now,
            policy=policy,
            rescheduling=rescheduling,
        )
    ]


def is_slot_available(
    session: Session,
    *,
    barber_id: int,
    service_id: int,
    starts_at: datetime,
    now: datetime,
    policy: BookingPolicy = CUSTOMER_POLICY,
    rescheduling: Rescheduling | None = None,
) -> bool:
    """RN-05: `starts_at` é exatamente um dos inícios oferecidos naquele dia.

    Usa a mesma conta da lista, então um início fora da grade (RN-04) não está
    disponível.
    """
    if starts_at.utcoffset() is None:
        raise ValueError("Use datetime com fuso horário (RN-01).")
    slots = list_available_slots(
        session,
        barber_id=barber_id,
        service_id=service_id,
        day=starts_at.astimezone(TIMEZONE).date(),
        now=now,
        policy=policy,
        rescheduling=rescheduling,
    )
    return any(slot.start == starts_at for slot in slots)


def ensure_slot_available(
    session: Session,
    *,
    barber_id: int,
    service_id: int,
    starts_at: datetime,
    now: datetime,
    policy: BookingPolicy = CUSTOMER_POLICY,
    rescheduling: Rescheduling | None = None,
) -> None:
    """Ponto de entrada da criação (S3.08) e da remarcação (S3.09).

    Trava a linha do barbeiro com `FOR SHARE` até o fim da transação: assim a
    inativação (RN-60), que trava com `FOR UPDATE`, espera a criação terminar,
    ou a criação já enxerga o barbeiro inativo. O mesmo vale para a criação de
    um bloqueio (RN-03), que também trava com `FOR UPDATE`: ou o bloqueio
    espera e enxerga o agendamento, ou a criação espera e enxerga o bloqueio
    entre os ocupados. A garantia final contra dois
    agendamentos no mesmo horário é a exclusion constraint da RN-08.
    """
    get_barber(session, barber_id, lock="share")
    if not is_slot_available(
        session,
        barber_id=barber_id,
        service_id=service_id,
        starts_at=starts_at,
        now=now,
        policy=policy,
        rescheduling=rescheduling,
    ):
        raise slot_unavailable()


def slot_unavailable() -> DomainError:
    """RN-08: a resposta para o horário que não está (ou deixou de estar) livre,
    inclusive quando o insert perde a disputa para outra reserva."""
    return DomainError(
        code="SLOT_UNAVAILABLE",
        message="Este horário não está mais disponível. Escolha outro.",
        status_code=409,
    )
