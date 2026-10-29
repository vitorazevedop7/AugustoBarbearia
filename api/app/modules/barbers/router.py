"""Rotas do cadastro de barbeiros, só para a administração (RN-70)."""

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_admin
from app.db import get_session
from app.errors import ErrorResponse
from app.modules.barbers import service
from app.modules.barbers.models import Barber
from app.modules.barbers.schemas import BarberCreate, BarberResponse, BarberUpdate

router = APIRouter(
    prefix="/admin/barbers",
    tags=["Barbeiros"],
    dependencies=[Depends(require_admin)],
    responses={401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}},
)
not_found: dict[int | str, dict[str, object]] = {404: {"model": ErrorResponse}}


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
    barber_id: int,
    session: Annotated[Session, Depends(get_session)],
) -> BarberResponse:
    return to_response(service.get_barber(session, barber_id))


@router.patch("/{barber_id}", response_model=BarberResponse, responses=not_found)
def update_barber(
    barber_id: int,
    data: BarberUpdate,
    session: Annotated[Session, Depends(get_session)],
) -> BarberResponse:
    return to_response(service.update_barber(session, barber_id, data))
