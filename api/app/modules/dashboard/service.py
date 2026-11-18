"""Regras do painel de indicadores (RN-01, RN-02, RN-03, RN-30, RN-42, RN-45).

- RN-01: "hoje", o mês e as janelas são dias de São Paulo, convertidos para UTC
  só na consulta (`period_bounds` da agenda); o atendimento pertence ao dia e à
  hora em que **começa**, como na agenda e no relatório;
- RN-45: o faturamento soma o valor cobrado (`Payment.amount`) dos `COMPLETED`;
  a taxa de faltas é faltas / (concluídos + faltas); o ticket médio é
  faturamento / concluídos; a ocupação é minutos ocupados / minutos de
  expediente livres de bloqueio (RN-02, RN-03);
- dinheiro e percentuais em `Decimal`; nada passa por `float`.
"""

import calendar
from collections import defaultdict
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.clock import TIMEZONE
from app.modules.agenda.service import period_bounds
from app.modules.appointments.models import Appointment, AppointmentStatus
from app.modules.barbers.models import Barber
from app.modules.barbers.service import list_active_barbers
from app.modules.catalog.models import Service
from app.modules.customers.models import Customer
from app.modules.payments.models import Payment
from app.modules.shop.service import list_business_hours
from app.modules.time_blocks.models import TimeBlock

ZERO = Decimal("0.00")
HUNDRED = Decimal(100)
CENT = Decimal("0.01")
TENTH = Decimal("0.1")

# RN-45: o gráfico de faturamento cobre hoje e os 29 dias anteriores.
DAILY_REVENUE_DAYS = 30
# RN-45: cada janela de ocupação tem 7 dias.
OCCUPANCY_DAYS = 7
# RN-45: os horários de pico olham os 90 dias antes de hoje.
PEAK_DAYS = 90

# Status que ocupam o horário do barbeiro na ocupação e no pico: tudo menos o
# cancelado (a falta segurou o horário, RN-30).
OCCUPYING = (
    AppointmentStatus.SCHEDULED,
    AppointmentStatus.COMPLETED,
    AppointmentStatus.NO_SHOW,
)

Interval = tuple[datetime, datetime]


@dataclass(frozen=True, slots=True)
class PeriodIndicators:
    start: date
    end: date
    revenue: Decimal
    completed_count: int
    no_show_count: int
    no_show_rate: Decimal | None
    average_ticket: Decimal | None


@dataclass(frozen=True, slots=True)
class IndicatorChanges:
    revenue: Decimal | None
    completed_count: Decimal | None
    average_ticket: Decimal | None
    no_show_rate: Decimal | None


@dataclass(frozen=True, slots=True)
class DailyRevenue:
    date: date
    revenue: Decimal
    completed_count: int


@dataclass(frozen=True, slots=True)
class OccupancyWindow:
    start: date
    end: date
    booked_minutes: int
    available_minutes: int
    rate: Decimal | None


@dataclass(frozen=True, slots=True)
class BarberOccupancy:
    barber_id: int
    barber_name: str
    past: OccupancyWindow
    upcoming: OccupancyWindow


@dataclass(frozen=True, slots=True)
class PeakRow:
    weekday: int
    open: bool
    counts: list[int]


@dataclass(frozen=True, slots=True)
class PeakHours:
    start: date
    end: date
    hours: list[int]
    rows: list[PeakRow]
    max_count: int


@dataclass(frozen=True, slots=True)
class TodayAppointment:
    id: int
    starts_at: datetime
    ends_at: datetime
    customer_name: str
    barber_name: str
    service_name: str
    in_progress: bool


@dataclass(frozen=True, slots=True)
class TodaySummary:
    date: date
    total_count: int
    completed_count: int
    upcoming: list[TodayAppointment]


@dataclass(frozen=True, slots=True)
class Dashboard:
    generated_at: datetime
    current: PeriodIndicators
    previous: PeriodIndicators
    changes: IndicatorChanges
    daily_revenue: list[DailyRevenue]
    occupancy: list[BarberOccupancy]
    peak_hours: PeakHours
    today: TodaySummary


# --- Contas -----------------------------------------------------------------


def percent(part: Decimal | int, whole: Decimal | int) -> Decimal | None:
    """`part` sobre `whole`, em %, com uma casa; `None` sem denominador."""
    if whole == 0:
        return None
    return (Decimal(part) * HUNDRED / Decimal(whole)).quantize(TENTH, ROUND_HALF_UP)


def change(current: Decimal | int, previous: Decimal | int) -> Decimal | None:
    """RN-45: variação de `previous` para `current`, em %; `None` se o
    anterior é zero (não há base para comparar)."""
    if previous == 0:
        return None
    return (
        (Decimal(current) - Decimal(previous)) * HUNDRED / Decimal(previous)
    ).quantize(TENTH, ROUND_HALF_UP)


def month_to_date(today: date) -> tuple[date, date]:
    """RN-45: do dia 1 do mês de `today` até `today`."""
    return today.replace(day=1), today


def previous_month_to_date(today: date) -> tuple[date, date]:
    """RN-45: o mesmo trecho no mês anterior: do dia 1 até o mesmo dia, ou o
    último dia do mês anterior se ele for mais curto (31/03 → 01/02 a 28/02)."""
    last_of_previous = today.replace(day=1) - timedelta(days=1)
    start = last_of_previous.replace(day=1)
    last_day = calendar.monthrange(start.year, start.month)[1]
    return start, start.replace(day=min(today.day, last_day))


def _minutes(delta: timedelta) -> int:
    return int(delta.total_seconds()) // 60


def merged_minutes(intervals: Iterable[Interval], window: Interval) -> int:
    """Minutos da união dos intervalos `[início, fim)` dentro de `window`. Dois
    intervalos que se cruzam contam uma vez só."""
    since, until = window
    clipped = sorted(
        (max(start, since), min(end, until))
        for start, end in intervals
        if start < until and end > since
    )
    total = timedelta()
    current: Interval | None = None
    for start, end in clipped:
        if current is None or start > current[1]:
            if current is not None:
                total += current[1] - current[0]
            current = (start, end)
        else:
            current = (current[0], max(current[1], end))
    if current is not None:
        total += current[1] - current[0]
    return _minutes(total)


# --- Blocos do painel -------------------------------------------------------


def period_indicators(session: Session, start: date, end: date) -> PeriodIndicators:
    """RN-45: faturamento, concluídos, faltas, taxa de faltas e ticket médio dos
    atendimentos que **começam** entre `start` e `end` (inclusivos)."""
    since, until = period_bounds(start, end)
    rows = session.execute(
        select(Appointment.status, Payment.amount)
        .outerjoin(Payment, Payment.appointment_id == Appointment.id)
        .where(
            Appointment.status.in_(
                (AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW)
            ),
            Appointment.starts_at >= since,
            Appointment.starts_at < until,
        )
    ).all()
    revenue = ZERO
    completed = 0
    no_shows = 0
    for status, amount in rows:
        if status == AppointmentStatus.COMPLETED:
            completed += 1
            # Todo `COMPLETED` tem pagamento (S5.06); sem ele, conta zero.
            revenue += amount if amount is not None else ZERO
        else:
            no_shows += 1
    return PeriodIndicators(
        start=start,
        end=end,
        revenue=revenue,
        completed_count=completed,
        no_show_count=no_shows,
        no_show_rate=percent(no_shows, completed + no_shows),
        average_ticket=(revenue / completed).quantize(CENT, ROUND_HALF_UP)
        if completed
        else None,
    )


def indicator_changes(
    current: PeriodIndicators, previous: PeriodIndicators
) -> IndicatorChanges:
    """RN-45: variações em %; a da taxa de faltas é em pontos percentuais."""
    return IndicatorChanges(
        revenue=change(current.revenue, previous.revenue),
        completed_count=change(current.completed_count, previous.completed_count),
        average_ticket=change(current.average_ticket, previous.average_ticket)
        if current.average_ticket is not None and previous.average_ticket is not None
        else None,
        no_show_rate=current.no_show_rate - previous.no_show_rate
        if current.no_show_rate is not None and previous.no_show_rate is not None
        else None,
    )


def daily_revenue(session: Session, today: date) -> list[DailyRevenue]:
    """RN-45: o faturamento de cada um dos últimos 30 dias (hoje incluso), com
    zero nos dias sem atendimento concluído."""
    first = today - timedelta(days=DAILY_REVENUE_DAYS - 1)
    since, until = period_bounds(first, today)
    revenue: dict[date, Decimal] = defaultdict(lambda: ZERO)
    count: dict[date, int] = defaultdict(int)
    for starts_at, amount in session.execute(
        select(Appointment.starts_at, Payment.amount)
        .join(Payment, Payment.appointment_id == Appointment.id)
        .where(
            Appointment.status == AppointmentStatus.COMPLETED,
            Appointment.starts_at >= since,
            Appointment.starts_at < until,
        )
    ):
        day = starts_at.astimezone(TIMEZONE).date()
        revenue[day] += amount
        count[day] += 1
    days = (first + timedelta(days=offset) for offset in range(DAILY_REVENUE_DAYS))
    return [
        DailyRevenue(date=day, revenue=revenue[day], completed_count=count[day])
        for day in days
    ]


def _open_intervals(session: Session, start: date, end: date) -> list[Interval]:
    """RN-02: o expediente de cada dia de `start` a `end`, em instantes."""
    hours = {row.weekday: row for row in list_business_hours(session)}
    intervals: list[Interval] = []
    day = start
    while day <= end:
        row = hours.get(day.weekday())
        if row is not None and row.opens_at is not None and row.closes_at is not None:
            intervals.append(
                (
                    datetime.combine(day, row.opens_at, TIMEZONE),
                    datetime.combine(day, row.closes_at, TIMEZONE),
                )
            )
        day += timedelta(days=1)
    return intervals


def _occupancy_window(
    start: date,
    end: date,
    open_intervals: Sequence[Interval],
    appointments: Sequence[Interval],
    blocks: Sequence[Interval],
) -> OccupancyWindow:
    """RN-45: o expediente da janela menos os bloqueios (RN-03) é o disponível;
    os agendamentos dentro dele, o ocupado (nunca acima do disponível)."""
    available = 0
    booked = 0
    for window in open_intervals:
        if not (start <= window[0].astimezone(TIMEZONE).date() <= end):
            continue
        free = _minutes(window[1] - window[0]) - merged_minutes(blocks, window)
        available += free
        booked += min(merged_minutes(appointments, window), free)
    return OccupancyWindow(
        start=start,
        end=end,
        booked_minutes=booked,
        available_minutes=available,
        rate=percent(booked, available),
    )


def occupancy(session: Session, today: date) -> list[BarberOccupancy]:
    """RN-45: a ocupação de cada barbeiro ativo, por nome, nos 7 dias antes de
    hoje e em hoje mais os 6 dias seguintes (dias inteiros de expediente)."""
    past_start = today - timedelta(days=OCCUPANCY_DAYS)
    past_end = today - timedelta(days=1)
    upcoming_end = today + timedelta(days=OCCUPANCY_DAYS - 1)
    since, until = period_bounds(past_start, upcoming_end)
    open_intervals = _open_intervals(session, past_start, upcoming_end)

    appointments: dict[int, list[Interval]] = defaultdict(list)
    for barber, starts_at, ends_at in session.execute(
        select(Appointment.barber_id, Appointment.starts_at, Appointment.ends_at).where(
            Appointment.status.in_(OCCUPYING),
            Appointment.starts_at < until,
            Appointment.ends_at > since,
        )
    ):
        appointments[barber].append((starts_at, ends_at))
    blocks: dict[int, list[Interval]] = defaultdict(list)
    for barber, starts_at, ends_at in session.execute(
        select(TimeBlock.barber_id, TimeBlock.starts_at, TimeBlock.ends_at).where(
            TimeBlock.starts_at < until, TimeBlock.ends_at > since
        )
    ):
        blocks[barber].append((starts_at, ends_at))

    return [
        BarberOccupancy(
            barber_id=barber.id,
            barber_name=barber.name,
            past=_occupancy_window(
                past_start,
                past_end,
                open_intervals,
                appointments[barber.id],
                blocks[barber.id],
            ),
            upcoming=_occupancy_window(
                today,
                upcoming_end,
                open_intervals,
                appointments[barber.id],
                blocks[barber.id],
            ),
        )
        for barber in list_active_barbers(session)
    ]


def _last_hour(closes_at: time) -> int:
    """A hora cheia que contém o minuto antes do fechamento (19:00 → 18)."""
    return (datetime.combine(date.min, closes_at) - timedelta(minutes=1)).hour


def peak_hours(session: Session, today: date) -> PeakHours:
    """RN-45: quantos atendimentos (agendados, concluídos e faltas) começaram em
    cada dia da semana e hora cheia, nos 90 dias antes de hoje, em São Paulo.

    A grade vai da primeira hora de abertura à última hora de expediente da
    semana atual (RN-02), estendida para caber qualquer atendimento fora dela.
    """
    start = today - timedelta(days=PEAK_DAYS)
    end = today - timedelta(days=1)
    since, until = period_bounds(start, end)
    counts: dict[tuple[int, int], int] = defaultdict(int)
    for (starts_at,) in session.execute(
        select(Appointment.starts_at).where(
            Appointment.status.in_(OCCUPYING),
            Appointment.starts_at >= since,
            Appointment.starts_at < until,
        )
    ):
        local = starts_at.astimezone(TIMEZONE)
        counts[(local.weekday(), local.hour)] += 1

    business = [
        (row.weekday, row.opens_at, row.closes_at)
        for row in list_business_hours(session)
        if row.opens_at is not None and row.closes_at is not None
    ]
    hours_seen = {hour for _, hour in counts}
    for _, opens_at, closes_at in business:
        hours_seen.update(range(opens_at.hour, _last_hour(closes_at) + 1))
    hours = list(range(min(hours_seen), max(hours_seen) + 1)) if hours_seen else []
    open_days = {weekday for weekday, _, _ in business}
    return PeakHours(
        start=start,
        end=end,
        hours=hours,
        rows=[
            PeakRow(
                weekday=weekday,
                open=weekday in open_days,
                counts=[counts[(weekday, hour)] for hour in hours],
            )
            for weekday in range(7)
        ],
        max_count=max(counts.values(), default=0),
    )


def today_summary(session: Session, today: date, now: datetime) -> TodaySummary:
    """Os atendimentos que começam hoje: o total (sem cancelados), os concluídos
    e os `SCHEDULED` que ainda não terminaram, por início."""
    since, until = period_bounds(today, today)
    rows = session.execute(
        select(Appointment, Customer.name, Barber.name, Service.name)
        .join(Customer, Customer.id == Appointment.customer_id)
        .join(Barber, Barber.id == Appointment.barber_id)
        .join(Service, Service.id == Appointment.service_id)
        .where(
            Appointment.status.in_(OCCUPYING),
            Appointment.starts_at >= since,
            Appointment.starts_at < until,
        )
        .order_by(Appointment.starts_at, Barber.name, Appointment.id)
    ).all()
    upcoming = [
        TodayAppointment(
            id=appointment.id,
            starts_at=appointment.starts_at.astimezone(TIMEZONE),
            ends_at=appointment.ends_at.astimezone(TIMEZONE),
            customer_name=customer,
            barber_name=barber,
            service_name=service,
            in_progress=appointment.starts_at <= now,
        )
        for appointment, customer, barber, service in rows
        if appointment.status == AppointmentStatus.SCHEDULED
        and appointment.ends_at > now
    ]
    return TodaySummary(
        date=today,
        total_count=len(rows),
        completed_count=sum(
            1 for row in rows if row[0].status == AppointmentStatus.COMPLETED
        ),
        upcoming=upcoming,
    )


def dashboard(session: Session, now: datetime) -> Dashboard:
    """O painel da administração no instante `now` (RN-45, RN-70)."""
    today = now.astimezone(TIMEZONE).date()
    current = period_indicators(session, *month_to_date(today))
    previous = period_indicators(session, *previous_month_to_date(today))
    return Dashboard(
        generated_at=now.astimezone(TIMEZONE),
        current=current,
        previous=previous,
        changes=indicator_changes(current, previous),
        daily_revenue=daily_revenue(session, today),
        occupancy=occupancy(session, today),
        peak_hours=peak_hours(session, today),
        today=today_summary(session, today, now),
    )
