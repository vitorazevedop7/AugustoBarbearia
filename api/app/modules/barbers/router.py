"""Rotas de barbeiros: o cadastro, só para a administração, e a vitrine (RN-70)."""

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_admin
from app.clock import utc_now
from app.db import get_session
from app.errors import ErrorResponse
from app.ids import Id
from app.modules.barbers import service
from app.modules.barbers.models import Barber
from app.modules.barbers.schemas import (
    BarberCreate,
    BarberResponse,
    BarberUpdate,
    PublicBarberResponse,
)

router = APIRouter(
    prefix="/admin/barbers",
    tags=["Barbeiros"],
    dependencies=[Depends(require_admin)],
    responses={401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}},
)
not_found: dict[int | str, dict[str, object]] = {404: {"model": ErrorResponse}}

# A vitrine é pública: qualquer um vê os barbeiros ativos (RN-70).
public_router = APIRouter(prefix="/public/barbers", tags=["Vitrine"])


def to_response(barber: Barber) -> BarberResponse:
    return BarberResponse(
        id=barber.id,
        name=barber.name,
        photo_path=barber.photo_path,
        bio=barber.bio,
        active=barber.active,
    )


@router.get("", response_model=list[BarberResponse])
def list_barbers(
    session: Annotated[Session, Depends(get_session)],
) -> list[BarberResponse]:
    return [to_response(barber) for barber in service.list_barbers(session)]


@router.post("", response_model=BarberResponse, status_code=status.HTTP_201_CREATED)
def create_barber(
    data: BarberCreate,
    session: Annotated[Session, Depends(get_session)],
) -> BarberResponse:
    return to_response(service.create_barber(session, data))


@router.get("/{barber_id}", response_model=BarberResponse, responses=not_found)
def get_barber(
    barber_id: Id,
    session: Annotated[Session, Depends(get_session)],
) -> BarberResponse:
    return to_response(service.get_barber(session, barber_id))


@router.patch(
    "/{barber_id}",
    response_model=BarberResponse,
    responses={**not_found, 409: {"model": ErrorResponse}},
)
def update_barber(
    barber_id: Id,
    data: BarberUpdate,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(utc_now)],
) -> BarberResponse:
    return to_response(service.update_barber(session, barber_id, data, now=now))


@public_router.get("", response_model=list[PublicBarberResponse])
def list_public_barbers(
    session: Annotated[Session, Depends(get_session)],
) -> list[PublicBarberResponse]:
    return [
        PublicBarberResponse(
            id=barber.id,
            name=barber.name,
            photo_path=barber.photo_path,
            bio=barber.bio,
        )
        for barber in service.list_active_barbers(session)
    ]
