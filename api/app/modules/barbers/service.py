"""Regras do cadastro de barbeiros (RN-60, RN-63)."""

from collections.abc import Sequence
from datetime import datetime
from typing import Literal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errors import DomainError
from app.modules.appointments.service import barber_has_future_appointments
from app.modules.barbers.models import Barber
from app.modules.barbers.schemas import BarberCreate, BarberUpdate


def list_barbers(session: Session) -> Sequence[Barber]:
    """Inativos continuam no cadastro (RN-60); os ativos vêm primeiro."""
    return session.scalars(
        select(Barber).order_by(Barber.active.desc(), Barber.name, Barber.id)
    ).all()


def list_active_barbers(session: Session) -> Sequence[Barber]:
    """RN-60: o barbeiro inativo some da vitrine. Os ativos vêm por nome."""
    return session.scalars(
        select(Barber).where(Barber.active).order_by(Barber.name, Barber.id)
    ).all()


def get_barber(
    session: Session,
    barber_id: int,
    *,
    lock: Literal["share", "update"] | None = None,
) -> Barber:
    """`lock` trava a linha até o fim da transação (`FOR SHARE`/`FOR UPDATE`) e
    relê os dados do banco, já com a versão confirmada mais recente."""
    barber = session.get(
        Barber,
        barber_id,
        with_for_update=None if lock is None else {"read": lock == "share"},
        populate_existing=lock is not None,
    )
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


def update_barber(
    session: Session, barber_id: int, data: BarberUpdate, *, now: datetime
) -> Barber:
    """RN-60: altera os campos enviados, inclusive a situação ativo/inativo.

    Um barbeiro com agendamentos ativos no futuro não pode ser inativado. A
    linha fica travada (`FOR UPDATE`) para a checagem não correr junto com a
    criação de um agendamento, que trava a mesma linha com `FOR SHARE`.
    """
    deactivating = data.active is False
    barber = get_barber(session, barber_id, lock="update" if deactivating else None)
    if (
        deactivating
        and barber.active
        and barber_has_future_appointments(session, barber.id, now)
    ):
        raise DomainError(
            code="BARBER_HAS_FUTURE_APPOINTMENTS",
            message=(
                "Este barbeiro tem agendamentos marcados. Cancele ou remarque "
                "esses agendamentos antes de inativá-lo."
            ),
            status_code=409,
        )
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(barber, field, value)
    session.commit()
    return barber
