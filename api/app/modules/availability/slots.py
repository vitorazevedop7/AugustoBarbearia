"""Cálculo puro dos horários disponíveis (RN-05), sem banco e sem relógio.

Tudo o que o cálculo precisa entra como argumento, inclusive o momento atual.
Os instantes são `datetime` com fuso; as horas de funcionamento são locais de
São Paulo (RN-01) e só viram instantes aqui dentro.
"""

from collections.abc import Iterable
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta

from app.clock import TIMEZONE

# RN-04: os inícios oferecidos andam de 30 em 30 minutos a partir da abertura.
SLOT_STEP = timedelta(minutes=30)


@dataclass(frozen=True, slots=True)
class TimeRange:
    """Intervalo `[start, end)`: o fim não pertence ao intervalo."""

    start: datetime
    end: datetime

    def __post_init__(self) -> None:
        _require_aware(self.start)
        _require_aware(self.end)
        if self.end <= self.start:
            raise ValueError("O fim do intervalo precisa ser depois do início.")

    def overlaps(self, other: TimeRange) -> bool:
        return self.start < other.end and other.start < self.end


@dataclass(frozen=True, slots=True)
class OpeningHours:
    """RN-02: abertura e fechamento de um dia, em hora local de São Paulo."""

    opens_at: time
    closes_at: time


@dataclass(frozen=True, slots=True)
class Offer:
    """O serviço pedido com o barbeiro escolhido (RN-05, item 5)."""

    duration: timedelta
    barber_active: bool
    service_active: bool
    barber_performs_service: bool

    @property
    def bookable(self) -> bool:
        return (
            self.barber_active and self.service_active and self.barber_performs_service
        )


@dataclass(frozen=True, slots=True)
class BookingPolicy:
    """Antecedência mínima e janela máxima (RN-06, RN-07). `None` desliga a regra."""

    min_notice: timedelta | None
    max_days_ahead: int | None


# RN-06 e RN-07: o cliente agenda com pelo menos 1 hora e até 30 dias à frente.
CUSTOMER_POLICY = BookingPolicy(min_notice=timedelta(hours=1), max_days_ahead=30)


def _require_aware(moment: datetime) -> None:
    if moment.utcoffset() is None:
        raise ValueError("Use datetime com fuso horário (RN-01).")


def opening_range(day: date, hours: OpeningHours) -> TimeRange:
    """RN-02 e RN-01: o expediente de `day` como intervalo de instantes."""
    return TimeRange(
        datetime.combine(day, hours.opens_at, tzinfo=TIMEZONE).astimezone(UTC),
        datetime.combine(day, hours.closes_at, tzinfo=TIMEZONE).astimezone(UTC),
    )


def within_window(day: date, now: datetime, policy: BookingPolicy) -> bool:
    """RN-07: a janela vai de hoje até hoje + `max_days_ahead`, em dias do
    calendário de São Paulo; o último dia é oferecido inteiro."""
    _require_aware(now)
    if policy.max_days_ahead is None:
        return True
    today = now.astimezone(TIMEZONE).date()
    return today <= day <= today + timedelta(days=policy.max_days_ahead)


def available_slots(
    *,
    day: date,
    hours: OpeningHours | None,
    offer: Offer,
    busy: Iterable[TimeRange],
    now: datetime,
    policy: BookingPolicy,
) -> list[TimeRange]:
    """RN-05: os horários de `day` em que `offer` pode começar, em ordem.

    - `day` é a data local de São Paulo e `hours`, o funcionamento dela
      (`None` = fechado, RN-02);
    - `busy` são os intervalos ocupados do barbeiro: agendamentos ativos
      (RN-08) e, quando existirem, bloqueios (RN-03);
    - `now` e `policy` aplicam a antecedência e a janela (RN-06, RN-07).

    Cada horário sai como o intervalo que o atendimento ocuparia, no fuso de
    São Paulo.
    """
    _require_aware(now)
    # RN-05, item 5: barbeiro e serviço ativos, e o barbeiro realiza o serviço.
    if not offer.bookable or offer.duration <= timedelta(0):
        return []
    # RN-02: dia fechado não tem horário.
    if hours is None:
        return []
    # RN-07: só dias dentro da janela.
    if not within_window(day, now, policy):
        return []
    # RN-06: o início precisa estar pelo menos `min_notice` depois de agora.
    earliest = now + policy.min_notice if policy.min_notice is not None else None

    # RN-01: horas locais viram instantes; a grade anda em tempo absoluto.
    expedient = opening_range(day, hours)
    occupied = tuple(busy)

    slots: list[TimeRange] = []
    start = expedient.start  # RN-04: a grade começa na abertura.
    # RN-02: o atendimento cabe inteiro no expediente.
    while start + offer.duration <= expedient.end:
        candidate = TimeRange(start, start + offer.duration)
        fits_notice = earliest is None or candidate.start >= earliest
        # RN-05, itens 3 e 4: não cruza bloqueio nem agendamento ativo.
        if fits_notice and not any(candidate.overlaps(item) for item in occupied):
            slots.append(
                TimeRange(
                    candidate.start.astimezone(TIMEZONE),
                    candidate.end.astimezone(TIMEZONE),
                )
            )
        start += SLOT_STEP
    return slots
