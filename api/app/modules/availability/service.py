"""Carrega os dados do banco e chama o cálculo puro (RN-05)."""

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


def _offer(session: Session, barber: Barber, service: Service) -> Offer:
    """RN-05, item 5: os dois ativos e o barbeiro realiza o serviço (RN-61)."""
    performs = session.scalar(
        select(
            exists().where(
                BarberService.barber_id == barber.id,
                BarberService.service_id == service.id,
            )
        )
    )
    return Offer(
        duration=timedelta(minutes=service.duration_minutes),
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


def _busy(session: Session, barber_id: int, window: TimeRange) -> list[TimeRange]:
    """Intervalos ocupados do barbeiro que cruzam `window`.

    RN-08: só agendamentos `SCHEDULED` ocupam a agenda. Os bloqueios (RN-03)
    entram nesta lista na Sprint 4.
    """
    rows = session.execute(
        select(Appointment.starts_at, Appointment.ends_at).where(
            Appointment.barber_id == barber_id,
            Appointment.status == AppointmentStatus.SCHEDULED,
            Appointment.starts_at < window.end,
            Appointment.ends_at > window.start,
        )
    ).all()
    return [TimeRange(starts_at, ends_at) for starts_at, ends_at in rows]


def list_available_slots(
    session: Session,
    *,
    barber_id: int,
    service_id: int,
    day: date,
    now: datetime,
    policy: BookingPolicy = CUSTOMER_POLICY,
) -> list[TimeRange]:
    """RN-05: os horários disponíveis de `day` (data local de São Paulo).

    Barbeiro ou serviço inexistente responde 404; inativo, ou barbeiro que não
    realiza o serviço, não tem horário nenhum.
    """
    barber = get_barber(session, barber_id)
    service = get_service(session, service_id)
    hours = _opening_hours(session, day)
    # Dia fechado ou fora da janela: não há o que consultar.
    if hours is None or not within_window(day, now, policy):
        return []
    return available_slots(
        day=day,
        hours=hours,
        offer=_offer(session, barber, service),
        busy=_busy(session, barber.id, opening_range(day, hours)),
        now=now,
        policy=policy,
    )


def list_available_days(
    session: Session,
    *,
    barber_id: int,
    service_id: int,
    now: datetime,
    policy: BookingPolicy = CUSTOMER_POLICY,
) -> list[date]:
    """RN-05 a RN-07: os dias da janela que têm pelo menos um horário disponível.

    Usa a mesma função pura de `list_available_slots`, dia a dia, mas lê o
    expediente, a oferta e os ocupados uma vez só para a janela inteira. A
    janela vem da política (RN-07); sem janela não há o que listar.
    """
    if policy.max_days_ahead is None:
        raise ValueError("A lista de dias precisa de uma janela (RN-07).")
    barber = get_barber(session, barber_id)
    service = get_service(session, service_id)
    offer = _offer(session, barber, service)
    if not offer.bookable:
        return []
    today = now.astimezone(TIMEZONE).date()
    days = [
        today + timedelta(days=offset) for offset in range(policy.max_days_ahead + 1)
    ]
    hours = {weekday: _opening_hours_of(session, weekday) for weekday in range(7)}
    window = TimeRange(
        datetime.combine(today, time.min, tzinfo=TIMEZONE),
        datetime.combine(days[-1] + timedelta(days=1), time.min, tzinfo=TIMEZONE),
    )
    busy = _busy(session, barber.id, window)
    return [
        day
        for day in days
        if available_slots(
            day=day,
            hours=hours[day.weekday()],
            offer=offer,
            busy=busy,
            now=now,
            policy=policy,
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
) -> None:
    """Ponto de entrada da criação de agendamento (S3.08).

    Trava a linha do barbeiro com `FOR SHARE` até o fim da transação: assim a
    inativação (RN-60), que trava com `FOR UPDATE`, espera a criação terminar,
    ou a criação já enxerga o barbeiro inativo. A garantia final contra dois
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
