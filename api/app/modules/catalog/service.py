"""Regras do cadastro de serviços (RN-61, RN-63)."""

from collections.abc import Iterable, Sequence
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.errors import DomainError
from app.modules.barbers.models import Barber
from app.modules.catalog.models import (
    DURATION_STEP_MINUTES,
    MIN_DURATION_MINUTES,
    Service,
)
from app.modules.catalog.schemas import ServiceCreate, ServiceUpdate


def check_price(price: Decimal) -> None:
    """RN-61: o preço é maior ou igual a zero."""
    if price < 0:
        raise DomainError(
            code="INVALID_SERVICE_PRICE",
            message="O preço não pode ser negativo.",
            status_code=422,
        )


def check_duration(duration_minutes: int) -> None:
    """RN-61: a duração é múltiplo de 5 minutos, com no mínimo 10 minutos."""
    if (
        duration_minutes < MIN_DURATION_MINUTES
        or duration_minutes % DURATION_STEP_MINUTES
    ):
        raise DomainError(
            code="INVALID_SERVICE_DURATION",
            message=(
                "A duração precisa ser de no mínimo 10 minutos, em múltiplos de 5."
            ),
            status_code=422,
        )


def resolve_barbers(session: Session, barber_ids: Iterable[int]) -> list[Barber]:
    """RN-61: o serviço é realizado por pelo menos um barbeiro cadastrado.

    Um barbeiro inativo pode continuar ligado ao serviço; ele só não é oferecido
    enquanto estiver inativo (RN-05, item 5).
    """
    ids = set(barber_ids)
    if not ids:
        raise DomainError(
            code="SERVICE_WITHOUT_BARBER",
            message="Escolha pelo menos um barbeiro para o serviço.",
            status_code=422,
        )
    barbers = session.scalars(select(Barber).where(Barber.id.in_(ids))).all()
    if len(barbers) != len(ids):
        raise DomainError(
            code="UNKNOWN_BARBER",
            message=(
                "Um dos barbeiros escolhidos não existe mais. "
                "Recarregue a página e tente de novo."
            ),
            status_code=422,
        )
    return list(barbers)


def list_services(session: Session) -> Sequence[Service]:
    """Inativos continuam no cadastro (RN-61); os ativos vêm primeiro."""
    return session.scalars(
        select(Service)
        .options(selectinload(Service.barbers))
        .order_by(Service.active.desc(), Service.name, Service.id)
    ).all()


def get_service(session: Session, service_id: int) -> Service:
    service = session.get(Service, service_id)
    if service is None:
        raise DomainError(
            code="SERVICE_NOT_FOUND",
            message="Serviço não encontrado.",
            status_code=404,
        )
    return service


def create_service(session: Session, data: ServiceCreate) -> Service:
    """RN-61: o serviço nasce ativo, com preço, duração e barbeiros válidos."""
    check_duration(data.duration_minutes)
    check_price(data.price)
    barbers = resolve_barbers(session, data.barber_ids)
    service = Service(
        **data.model_dump(exclude={"barber_ids"}), barbers=barbers, active=True
    )
    session.add(service)
    session.commit()
    return service


def update_service(session: Session, service_id: int, data: ServiceUpdate) -> Service:
    """RN-61: altera os campos enviados, inclusive os barbeiros e a situação.

    Não existe exclusão: o serviço que sai é inativado. Agendamentos já criados
    guardam o próprio preço e a própria duração (RN-13).
    """
    service = get_service(session, service_id)
    changes = data.model_dump(exclude_unset=True)
    if data.duration_minutes is not None:
        check_duration(data.duration_minutes)
    if data.price is not None:
        check_price(data.price)
    if data.barber_ids is not None:
        service.barbers = resolve_barbers(session, data.barber_ids)
    for field, value in changes.items():
        if field != "barber_ids":
            setattr(service, field, value)
    session.commit()
    return service
