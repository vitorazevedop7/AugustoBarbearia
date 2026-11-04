"""Dados fictícios da demonstração: `python -m app.jobs.seed_demo` (ADR 0010, #184).

Cria clientes, duas semanas de agenda em volta de hoje (concluídos com
pagamento, faltas, cancelamentos e marcados) e dois bloqueios, para a agenda e
o relatório não aparecerem vazios na apresentação. Só roda num banco cujo nome
termina em `_demo` e que ainda não tem agendamentos: o banco de produção nunca
recebe esses dados.
"""

import logging
import random
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta

from sqlalchemy import func, select
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from app.clock import TIMEZONE, utc_now
from app.config import get_settings
from app.db import get_engine
from app.modules.appointments.models import (
    Appointment,
    AppointmentSource,
    AppointmentStatus,
    CanceledBy,
)
from app.modules.availability.slots import SLOT_STEP
from app.modules.barbers.models import Barber
from app.modules.catalog.models import BarberService, Service
from app.modules.customers.models import Customer
from app.modules.payments.models import Payment, PaymentMethod
from app.modules.shop.models import BusinessHours
from app.modules.time_blocks.models import TimeBlock

logger = logging.getLogger(__name__)

DEMO_SUFFIX = "_demo"
PAST_DAYS = 7
FUTURE_DAYS = 7
# Fixo para a agenda sair igual a cada recriação do banco.
DEFAULT_SEED = 184
FALLBACK_CLOSED_BY = "administracao@exemplo.com.br"

# Sem e-mail: nenhum cliente fictício recebe confirmação ou lembrete.
CUSTOMERS = (
    ("Rafael Souza", "75991234501"),
    ("Thiago Almeida", "75991234502"),
    ("Lucas Pereira", "75991234503"),
    ("Bruno Carvalho", "75991234504"),
    ("Gustavo Lima", "75991234505"),
    ("Felipe Santos", "75991234506"),
    ("Mateus Oliveira", "75991234507"),
    ("João Victor Rocha", "75991234508"),
    ("Pedro Henrique Dias", "75991234509"),
    ("Caio Ribeiro", "75991234510"),
    ("Diego Martins", "75991234511"),
    ("André Costa", "75991234512"),
    ("Vinícius Barbosa", "75991234513"),
    ("Eduardo Nunes", "75991234514"),
    ("Leonardo Freitas", "75991234515"),
    ("Marcos Teixeira", "75991234516"),
    ("Igor Cardoso", "75991234517"),
    ("Samuel Moreira", "75991234518"),
)

# Pesos aproximados de uma barbearia: Pix na frente, dinheiro por último.
PAYMENT_WEIGHTS = (
    (PaymentMethod.PIX, 45),
    (PaymentMethod.CREDIT, 20),
    (PaymentMethod.DEBIT, 20),
    (PaymentMethod.CASH, 15),
)


class DemoSeedError(Exception):
    """O banco não é de demonstração ou já tem dados."""


class DemoAlreadySeededError(DemoSeedError):
    """O banco de demonstração já tem agendamentos: não há o que fazer."""


@dataclass(frozen=True)
class SeedReport:
    customers: int
    completed: int
    no_show: int
    canceled: int
    scheduled: int
    time_blocks: int


def check_demo_database(url: str) -> None:
    """Recusa qualquer banco cujo nome não termine em `_demo`."""
    name = make_url(url).database or ""
    if not name.endswith(DEMO_SUFFIX):
        raise DemoSeedError(
            f"O banco '{name}' não é de demonstração (o nome precisa terminar em"
            f" '{DEMO_SUFFIX}'). Nada foi gravado."
        )


def seed(
    session: Session,
    now: datetime,
    *,
    closed_by: str = FALLBACK_CLOSED_BY,
    rng: random.Random | None = None,
) -> SeedReport:
    """Grava os dados fictícios na sessão, sem commit."""
    if session.scalar(select(func.count()).select_from(Appointment)):
        raise DemoAlreadySeededError(
            "O banco já tem agendamentos. Para recriar a demonstração, apague o"
            " banco dela e rode de novo. Nada foi gravado."
        )
    rng = rng or random.Random(DEFAULT_SEED)
    barbers = session.scalars(
        select(Barber).where(Barber.active).order_by(Barber.id)
    ).all()
    hours = {row.weekday: row for row in session.scalars(select(BusinessHours))}
    offers = _offers(session)
    customers = [Customer(name=name, phone=phone) for name, phone in CUSTOMERS]
    session.add_all(customers)
    session.flush()

    today = now.astimezone(TIMEZONE).date()
    blocks = _time_blocks(barbers, hours, today)
    session.add_all(blocks)

    counts = dict.fromkeys(AppointmentStatus, 0)
    payments: list[tuple[Appointment, PaymentMethod]] = []
    for offset in range(-PAST_DAYS, FUTURE_DAYS + 1):
        day = today + timedelta(days=offset)
        expedient = hours.get(day.weekday())
        if expedient is None or expedient.opens_at is None:
            continue
        assert expedient.closes_at is not None
        for barber in barbers:
            services = offers.get(barber.id)
            if not services:
                continue
            busy = [
                (block.starts_at, block.ends_at)
                for block in blocks
                if block.barber_id == barber.id
            ]
            start = _at(day, expedient.opens_at)
            closes = _at(day, expedient.closes_at)
            while start + SLOT_STEP <= closes:
                service = rng.choice(services)
                ends = start + timedelta(minutes=service.duration_minutes)
                blocked = any(s < ends and start < e for s, e in busy)
                if blocked or ends > closes or rng.random() >= _occupancy(offset):
                    start += SLOT_STEP
                    continue
                appointment, method = _appointment(
                    rng,
                    customer=rng.choice(customers),
                    barber=barber,
                    service=service,
                    starts_at=start,
                    now=now,
                    closed_by=closed_by,
                )
                session.add(appointment)
                counts[appointment.status] += 1
                if method is not None:
                    payments.append((appointment, method))
                # A próxima reserva começa no primeiro horário da grade livre.
                while start < ends:
                    start += SLOT_STEP
    session.flush()
    # RN-40: o concluído tem o pagamento, com o preço congelado como valor.
    session.add_all(
        Payment(appointment_id=appointment.id, amount=appointment.price, method=method)
        for appointment, method in payments
    )
    session.flush()
    return SeedReport(
        customers=len(customers),
        completed=counts[AppointmentStatus.COMPLETED],
        no_show=counts[AppointmentStatus.NO_SHOW],
        canceled=counts[AppointmentStatus.CANCELED],
        scheduled=counts[AppointmentStatus.SCHEDULED],
        time_blocks=len(blocks),
    )


def _offers(session: Session) -> dict[int, list[Service]]:
    """Os serviços ativos de cada barbeiro (RN-61)."""
    rows = session.execute(
        select(BarberService.barber_id, Service)
        .join(Service, Service.id == BarberService.service_id)
        .where(Service.active)
        .order_by(Service.id)
    ).all()
    offers: dict[int, list[Service]] = {}
    for barber_id, service in rows:
        offers.setdefault(barber_id, []).append(service)
    return offers


def _time_blocks(
    barbers: Sequence[Barber], hours: dict[int, BusinessHours], today: date
) -> list[TimeBlock]:
    """Uma folga de dia inteiro e um bloqueio de duas horas, nos próximos dias
    de expediente, para a agenda mostrar os dois tipos (RN-03)."""
    open_days = [
        day
        for day in (today + timedelta(days=offset) for offset in range(2, 14))
        if (row := hours.get(day.weekday())) is not None and row.opens_at is not None
    ]
    blocks: list[TimeBlock] = []
    if len(barbers) >= 2 and open_days:
        day_off = open_days[0]
        blocks.append(
            TimeBlock(
                barber_id=barbers[1].id,
                starts_at=_at(day_off, time(0)),
                ends_at=_at(day_off + timedelta(days=1), time(0)),
                reason="Folga",
            )
        )
    if len(barbers) >= 3 and len(open_days) >= 2:
        day = open_days[1]
        opens = hours[day.weekday()].opens_at
        assert opens is not None
        starts = _at(day, opens) + timedelta(hours=2)
        blocks.append(
            TimeBlock(
                barber_id=barbers[2].id,
                starts_at=starts,
                ends_at=starts + timedelta(hours=2),
                reason="Consulta médica",
            )
        )
    return blocks


def _occupancy(offset: int) -> float:
    """Dias passados cheios; os próximos dias mais vazios, com horários para o
    agendamento ao vivo na apresentação."""
    if offset < 0:
        return 0.7
    if offset == 0:
        return 0.45
    return max(0.15, 0.45 - 0.05 * offset)


def _appointment(
    rng: random.Random,
    *,
    customer: Customer,
    barber: Barber,
    service: Service,
    starts_at: datetime,
    now: datetime,
    closed_by: str,
) -> tuple[Appointment, PaymentMethod | None]:
    """O agendamento e, se concluído, a forma de pagamento."""
    ends_at = starts_at + timedelta(minutes=service.duration_minutes)
    appointment = Appointment(
        customer_id=customer.id,
        barber_id=barber.id,
        service_id=service.id,
        starts_at=starts_at,
        ends_at=ends_at,
        # RN-13: preço e duração congelados no momento da reserva.
        price=service.price,
        duration_minutes=service.duration_minutes,
        source=AppointmentSource.ONLINE
        if rng.random() < 0.6
        else AppointmentSource.ADMIN,
    )
    draw = rng.random()
    if draw < 0.06:
        # RN-33: cancelamento registra quando e quem.
        appointment.status = AppointmentStatus.CANCELED
        appointment.canceled_at = min(starts_at - timedelta(hours=5), now)
        appointment.canceled_by = (
            CanceledBy.CUSTOMER if rng.random() < 0.7 else CanceledBy.ADMIN
        )
    elif ends_at > now:
        appointment.status = AppointmentStatus.SCHEDULED
    elif draw < 0.11:
        # RN-33: a falta registra quando e quem.
        appointment.status = AppointmentStatus.NO_SHOW
        appointment.closed_at = min(ends_at + timedelta(minutes=10), now)
        appointment.closed_by = closed_by
    else:
        # RN-40: concluído com o valor cobrado e a forma de pagamento.
        appointment.status = AppointmentStatus.COMPLETED
        appointment.closed_at = min(ends_at + timedelta(minutes=5), now)
        appointment.closed_by = closed_by
        return appointment, _payment_method(rng)
    return appointment, None


def _payment_method(rng: random.Random) -> PaymentMethod:
    methods = [method for method, _ in PAYMENT_WEIGHTS]
    weights = [weight for _, weight in PAYMENT_WEIGHTS]
    return rng.choices(methods, weights=weights)[0]


def _at(day: date, moment: time) -> datetime:
    """Hora local de São Paulo num dia (RN-01)."""
    return datetime.combine(day, moment, tzinfo=TIMEZONE)


def main() -> None:
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s"
    )
    settings = get_settings()
    check_demo_database(settings.database_url)
    admins = [email.strip() for email in settings.admin_emails.split(",")]
    closed_by = next((email for email in admins if email), FALLBACK_CLOSED_BY)
    with Session(get_engine()) as session:
        try:
            report = seed(session, utc_now(), closed_by=closed_by)
        except DemoAlreadySeededError as error:
            # Rodar de novo na mesma demonstração não é erro: o script a sobe
            # sempre com este comando.
            logger.info("%s", error)
            return
        session.commit()
    logger.info(
        "Demonstração pronta: %d clientes, %d concluídos, %d faltas, %d cancelados,"
        " %d marcados e %d bloqueios.",
        report.customers,
        report.completed,
        report.no_show,
        report.canceled,
        report.scheduled,
        report.time_blocks,
    )


if __name__ == "__main__":
    try:
        main()
    except DemoSeedError as error:
        raise SystemExit(str(error)) from None
