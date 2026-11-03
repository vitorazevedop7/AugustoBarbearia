"""Regras da barbearia e do horário de funcionamento (RN-01, RN-02)."""

from collections.abc import Sequence
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.clock import TIMEZONE
from app.errors import DomainError
from app.modules.appointments.models import Appointment, AppointmentStatus
from app.modules.barbers.models import Barber
from app.modules.customers.models import Customer
from app.modules.shop.models import SHOP_ID, BusinessHours, Shop
from app.modules.shop.schemas import (
    BusinessHoursConflict,
    BusinessHoursDay,
    ConflictingAppointment,
    ShopUpdate,
)

# Quantos agendamentos a recusa da RN-02 lista; `total` conta todos.
CONFLICT_LIST_LIMIT = 20

WEEKDAY_NAMES = (
    "Na segunda-feira",
    "Na terça-feira",
    "Na quarta-feira",
    "Na quinta-feira",
    "Na sexta-feira",
    "No sábado",
    "No domingo",
)


def get_shop(session: Session) -> Shop:
    """O registro único nasce na migração; a ausência é falha de instalação."""
    shop = session.get(Shop, SHOP_ID)
    if shop is None:
        raise RuntimeError("O registro da barbearia não existe; rode as migrações.")
    return shop


def list_business_hours(session: Session) -> Sequence[BusinessHours]:
    return session.scalars(select(BusinessHours).order_by(BusinessHours.weekday)).all()


def get_business_hours(
    session: Session, weekday: int, *, lock: bool = False
) -> BusinessHours | None:
    """RN-02: o horário do dia (0 = segunda … 6 = domingo).

    A reserva usa `FOR SHARE` até o commit e relê a versão mais recente, mesmo
    que o expediente já estivesse no identity map. A edição usa `FOR UPDATE`.
    """
    return session.get(
        BusinessHours,
        weekday,
        with_for_update={"read": True} if lock else None,
        populate_existing=lock,
    )


def update_shop(session: Session, data: ShopUpdate) -> Shop:
    shop = get_shop(session)
    for field, value in data.model_dump().items():
        setattr(shop, field, value)
    session.commit()
    return shop


def _invalid_hours(message: str) -> DomainError:
    return DomainError(code="INVALID_BUSINESS_HOURS", message=message, status_code=422)


def update_business_hours(
    session: Session, days: Sequence[BusinessHoursDay], *, now: datetime
) -> Sequence[BusinessHours]:
    """RN-02: a semana inteira de uma vez; cada dia é fechado (sem horas) ou
    abre antes de fechar. Horas são locais de São Paulo (RN-01)."""
    if sorted(day.weekday for day in days) != list(range(7)):
        raise _invalid_hours("Informe o horário dos sete dias da semana.")
    for day in days:
        name = WEEKDAY_NAMES[day.weekday]
        if day.opens_at is None and day.closes_at is None:
            continue
        # Só uma das horas: o dia não está fechado, falta a outra.
        if day.closes_at is None:
            raise _invalid_hours(f"{name}, informe o horário de fechamento.")
        if day.opens_at is None:
            raise _invalid_hours(f"{name}, informe o horário de abertura.")
        if day.opens_at >= day.closes_at:
            raise _invalid_hours(f"{name}, a abertura precisa ser antes do fechamento.")

    # RN-02 × RN-05: trava os sete dias em ordem antes da leitura dos
    # agendamentos. Reservas em andamento mantêm FOR SHARE no dia escolhido;
    # depois da espera, a leitura enxerga o commit delas (READ COMMITTED).
    rows = session.scalars(
        select(BusinessHours)
        .order_by(BusinessHours.weekday)
        .with_for_update()
        .execution_options(populate_existing=True)
    ).all()
    by_weekday = {row.weekday: row for row in rows}
    _ensure_appointments_fit(session, _changed_days(days, by_weekday), now)
    for day in days:
        row = by_weekday.get(day.weekday)
        if row is None:
            row = BusinessHours(weekday=day.weekday)
            session.add(row)
        row.opens_at = day.opens_at
        row.closes_at = day.closes_at
    session.commit()
    return list_business_hours(session)


def _changed_days(
    days: Sequence[BusinessHoursDay], current: dict[int, BusinessHours]
) -> list[BusinessHoursDay]:
    """RN-02: só os dias cujo horário muda. Um agendamento que já estava fora
    do expediente (de antes da #105, ou um encaixe da administração) impede a
    mudança do dia dele, não a de outros dias (decisão da #124)."""
    changed: list[BusinessHoursDay] = []
    for day in days:
        row = current.get(day.weekday)
        if row is None or (row.opens_at, row.closes_at) != (
            day.opens_at,
            day.closes_at,
        ):
            changed.append(day)
    return changed


def _ensure_appointments_fit(
    session: Session, days: Sequence[BusinessHoursDay], now: datetime
) -> None:
    """RN-02, RN-05 e RN-30: não deixa um agendamento ativo futuro fora do
    novo expediente dos dias que mudam. O intervalo é o congelado (RN-13), em
    São Paulo (RN-01). A recusa lista os agendamentos afetados, para a
    administração chegar a cada um sem procurar na agenda (#124).
    Não trava agendamentos: a edição só disputa as linhas de BusinessHours,
    sem inverter as travas da criação ou da remarcação.
    """
    by_weekday = {day.weekday: day for day in days}
    if not by_weekday:
        return
    rows = session.execute(
        select(Appointment, Barber.name, Customer.name)
        .join(Barber, Barber.id == Appointment.barber_id)
        .join(Customer, Customer.id == Appointment.customer_id)
        .where(
            Appointment.status == AppointmentStatus.SCHEDULED,
            Appointment.starts_at > now,
        )
        .order_by(Appointment.starts_at, Appointment.id)
    )
    conflicts: list[ConflictingAppointment] = []
    for appointment, barber_name, customer_name in rows:
        start = appointment.starts_at.astimezone(TIMEZONE)
        day = by_weekday.get(start.weekday())
        if day is None or _fits(start, appointment.ends_at, day):
            continue
        conflicts.append(
            ConflictingAppointment(
                id=appointment.id,
                starts_at=start,
                ends_at=appointment.ends_at.astimezone(TIMEZONE),
                barber_name=barber_name,
                customer_name=customer_name,
            )
        )
    if conflicts:
        raise _conflict(conflicts)


def _fits(start: datetime, ends_at: datetime, day: BusinessHoursDay) -> bool:
    return (
        day.opens_at is not None
        and day.closes_at is not None
        and start >= datetime.combine(start.date(), day.opens_at, tzinfo=TIMEZONE)
        and ends_at <= datetime.combine(start.date(), day.closes_at, tzinfo=TIMEZONE)
    )


def _conflict(conflicts: list[ConflictingAppointment]) -> DomainError:
    total = len(conflicts)
    message = (
        "Há 1 agendamento futuro fora do novo horário de funcionamento. "
        "Remarque ou cancele esse agendamento antes de alterar o horário."
        if total == 1
        else f"Há {total} agendamentos futuros fora do novo horário de "
        "funcionamento. Remarque ou cancele esses agendamentos antes de "
        "alterar o horário."
    )
    body = BusinessHoursConflict(
        code="BUSINESS_HOURS_CONFLICT",
        message=message,
        appointments=conflicts[:CONFLICT_LIST_LIMIT],
        total=total,
    )
    return DomainError(
        code=body.code,
        message=body.message,
        status_code=409,
        extra=body.model_dump(mode="json", exclude={"code", "message"}),
    )
