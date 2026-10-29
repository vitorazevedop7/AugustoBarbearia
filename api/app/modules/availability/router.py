"""Rota pública dos horários disponíveis, sem login (RN-70)."""

import datetime as dt
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.clock import utc_now
from app.db import get_session
from app.errors import ErrorResponse
from app.modules.availability import service
from app.modules.availability.schemas import (
    AvailabilityResponse,
    AvailableDaysResponse,
    AvailableSlot,
)

router = APIRouter(tags=["Disponibilidade"])


@router.get(
    "/public/availability",
    response_model=AvailabilityResponse,
    responses={404: {"model": ErrorResponse}},
)
def get_availability(
    barber_id: int,
    service_id: int,
    day: Annotated[
        dt.date, Query(alias="date", description="Data local de São Paulo.")
    ],
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[dt.datetime, Depends(utc_now)],
) -> AvailabilityResponse:
    """Horários de início disponíveis para o cliente (RN-05 a RN-07)."""
    slots = service.list_available_slots(
        session, barber_id=barber_id, service_id=service_id, day=day, now=now
    )
    return AvailabilityResponse(
        barber_id=barber_id,
        service_id=service_id,
        date=day,
        slots=[AvailableSlot(starts_at=slot.start, ends_at=slot.end) for slot in slots],
    )


@router.get(
    "/public/availability/days",
    response_model=AvailableDaysResponse,
    responses={404: {"model": ErrorResponse}},
)
def get_available_days(
    barber_id: int,
    service_id: int,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[dt.datetime, Depends(utc_now)],
) -> AvailableDaysResponse:
    """Dias da janela do cliente com pelo menos um horário livre (RN-05 a RN-07)."""
    days = service.list_available_days(
        session, barber_id=barber_id, service_id=service_id, now=now
    )
    return AvailableDaysResponse(barber_id=barber_id, service_id=service_id, days=days)
