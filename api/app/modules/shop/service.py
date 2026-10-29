"""Regras da barbearia e do horário de funcionamento (RN-01, RN-02)."""

from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errors import DomainError
from app.modules.shop.models import SHOP_ID, BusinessHours, Shop
from app.modules.shop.schemas import BusinessHoursDay, ShopUpdate

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


def get_business_hours(session: Session, weekday: int) -> BusinessHours | None:
    """RN-02: o horário de um dia da semana (0 = segunda … 6 = domingo)."""
    return session.get(BusinessHours, weekday)


def update_shop(session: Session, data: ShopUpdate) -> Shop:
    shop = get_shop(session)
    for field, value in data.model_dump().items():
        setattr(shop, field, value)
    session.commit()
    return shop


def update_business_hours(
    session: Session, days: Sequence[BusinessHoursDay]
) -> Sequence[BusinessHours]:
    """RN-02: a semana inteira de uma vez; cada dia é fechado (sem horas) ou
    abre antes de fechar. Horas são locais de São Paulo (RN-01)."""
    if sorted(day.weekday for day in days) != list(range(7)):
        raise DomainError(
            code="INVALID_BUSINESS_HOURS",
            message="Informe o horário dos sete dias da semana.",
            status_code=422,
        )
    for day in days:
        closed = day.opens_at is None and day.closes_at is None
        valid_interval = (
            day.opens_at is not None
            and day.closes_at is not None
            and day.opens_at < day.closes_at
        )
        if not (closed or valid_interval):
            raise DomainError(
                code="INVALID_BUSINESS_HOURS",
                message=(
                    f"{WEEKDAY_NAMES[day.weekday]}, a abertura precisa ser "
                    "antes do fechamento."
                ),
                status_code=422,
            )

    for day in days:
        row = session.get(BusinessHours, day.weekday)
        if row is None:
            row = BusinessHours(weekday=day.weekday)
            session.add(row)
        row.opens_at = day.opens_at
        row.closes_at = day.closes_at
    session.commit()
    return list_business_hours(session)
