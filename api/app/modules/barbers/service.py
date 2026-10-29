"""Regras do cadastro de barbeiros (RN-60, RN-63)."""

from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errors import DomainError
from app.modules.barbers.models import Barber
from app.modules.barbers.schemas import BarberCreate, BarberUpdate


def list_barbers(session: Session) -> Sequence[Barber]:
    """Inativos continuam no cadastro (RN-60); os ativos vêm primeiro."""
    return session.scalars(
        select(Barber).order_by(Barber.active.desc(), Barber.name, Barber.id)
    ).all()


def get_barber(session: Session, barber_id: int) -> Barber:
    barber = session.get(Barber, barber_id)
    if barber is None:
        raise DomainError(
            code="BARBER_NOT_FOUND",
            message="Barbeiro não encontrado.",
            status_code=404,
        )
    return barber


def create_barber(session: Session, data: BarberCreate) -> Barber:
    """RN-60: o barbeiro nasce ativo."""
    barber = Barber(**data.model_dump(), active=True)
    session.add(barber)
    session.commit()
    return barber


def update_barber(session: Session, barber_id: int, data: BarberUpdate) -> Barber:
    """RN-60: altera os campos enviados, inclusive a situação ativo/inativo.

    A trava que impede inativar um barbeiro com agendamentos ativos no futuro
    entra com o agendamento (S3.07).
    """
    barber = get_barber(session, barber_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(barber, field, value)
    session.commit()
    return barber
