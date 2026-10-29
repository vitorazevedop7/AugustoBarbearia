"""Rotas do cadastro de serviços, só para a administração (RN-70)."""

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_admin
from app.db import get_session
from app.errors import ErrorResponse
from app.modules.catalog import service
from app.modules.catalog.models import Service
from app.modules.catalog.schemas import (
    ServiceBarber,
    ServiceCreate,
    ServiceResponse,
    ServiceUpdate,
)

router = APIRouter(
    prefix="/admin/services",
    tags=["Serviços"],
    dependencies=[Depends(require_admin)],
    responses={401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}},
)
not_found: dict[int | str, dict[str, object]] = {404: {"model": ErrorResponse}}


def to_response(item: Service) -> ServiceResponse:
    return ServiceResponse(
        id=item.id,
        name=item.name,
        description=item.description,
        price=item.price,
        duration_minutes=item.duration_minutes,
        active=item.active,
        barbers=[
            ServiceBarber(id=barber.id, name=barber.name, active=barber.active)
            for barber in item.barbers
        ],
    )


@router.get("", response_model=list[ServiceResponse])
def list_services(
    session: Annotated[Session, Depends(get_session)],
) -> list[ServiceResponse]:
    return [to_response(item) for item in service.list_services(session)]


@router.post("", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
def create_service(
    data: ServiceCreate,
    session: Annotated[Session, Depends(get_session)],
) -> ServiceResponse:
    return to_response(service.create_service(session, data))


@router.get("/{service_id}", response_model=ServiceResponse, responses=not_found)
def get_service(
    service_id: int,
    session: Annotated[Session, Depends(get_session)],
) -> ServiceResponse:
    return to_response(service.get_service(session, service_id))


@router.patch("/{service_id}", response_model=ServiceResponse, responses=not_found)
def update_service(
    service_id: int,
    data: ServiceUpdate,
    session: Annotated[Session, Depends(get_session)],
) -> ServiceResponse:
    return to_response(service.update_service(session, service_id, data))
