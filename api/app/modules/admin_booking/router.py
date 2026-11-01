"""Rotas do agendamento pela administração (RN-20 a RN-22, RN-70).

A resposta de cada agendamento é a da agenda (`AdminAppointmentResponse`).
"""

import datetime as dt
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_admin
from app.clock import utc_now
from app.db import get_session
from app.errors import ErrorResponse
from app.modules.admin_booking import service
from app.modules.admin_booking.schemas import (
    AdminAppointmentCreate,
    AdminAppointmentReschedule,
)
from app.modules.agenda.router import to_response
from app.modules.agenda.schemas import AdminAppointmentResponse
from app.modules.availability.schemas import (
    AvailabilityResponse,
    AvailableDaysResponse,
    AvailableSlot,
)
from app.modules.availability.slots import TimeRange

router = APIRouter(
    prefix="/admin",
    tags=["Agendamento pela administração"],
    dependencies=[Depends(require_admin)],
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        409: {"model": ErrorResponse},
    },
)

SessionDep = Annotated[Session, Depends(get_session)]
NowDep = Annotated[dt.datetime, Depends(utc_now)]
# Maior valor de uma coluna `integer`: ids acima disso são 404, não erro do banco.
AppointmentId = Annotated[int, Path(ge=1, le=2_147_483_647)]
LocalDate = Annotated[
    dt.date, Query(alias="date", description="Data local de São Paulo.")
]
OptionalBarber = Annotated[int | None, Query(description="Sem ele, o barbeiro atual.")]


def _slots(slots: list[TimeRange]) -> list[AvailableSlot]:
    return [AvailableSlot(starts_at=slot.start, ends_at=slot.end) for slot in slots]


@router.get("/availability", response_model=AvailabilityResponse)
def get_availability(
    barber_id: int,
    service_id: int,
    day: LocalDate,
    session: SessionDep,
    now: NowDep,
) -> AvailabilityResponse:
    """Horários do dia para um agendamento da administração: RN-05, itens 1 a
    5, sem antecedência nem janela (RN-21)."""
    slots = service.admin_slots(
        session, barber_id=barber_id, service_id=service_id, day=day, now=now
    )
    return AvailabilityResponse(
        barber_id=barber_id, service_id=service_id, date=day, slots=_slots(slots)
    )


@router.get("/availability/days", response_model=AvailableDaysResponse)
def get_available_days(
    barber_id: int, service_id: int, session: SessionDep, now: NowDep
) -> AvailableDaysResponse:
    """Dias de hoje até hoje + 30 com pelo menos um horário (RN-21). Os 30 dias
    são só o tamanho da lista."""
    days = service.admin_days(
        session, barber_id=barber_id, service_id=service_id, now=now
    )
    return AvailableDaysResponse(barber_id=barber_id, service_id=service_id, days=days)


@router.post(
    "/appointments",
    response_model=AdminAppointmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_appointment(
    data: AdminAppointmentCreate, session: SessionDep, now: NowDep
) -> AdminAppointmentResponse:
    """Agenda para um cliente já cadastrado ou novo (RN-13, RN-20, RN-21)."""
    entry = service.create_admin_appointment(
        session,
        customer_id=data.customer_id,
        new_customer=data.customer,
        barber_id=data.barber_id,
        service_id=data.service_id,
        starts_at=data.starts_at,
        now=now,
    )
    return to_response(entry)


@router.post(
    "/appointments/{appointment_id}/cancel", response_model=AdminAppointmentResponse
)
def cancel_appointment(
    appointment_id: AppointmentId, session: SessionDep, now: NowDep
) -> AdminAppointmentResponse:
    """Cancela qualquer agendamento ativo, sem prazo (RN-22, RN-31 a RN-33)."""
    return to_response(service.cancel_admin_appointment(session, appointment_id, now))


@router.post(
    "/appointments/{appointment_id}/reschedule",
    response_model=AdminAppointmentResponse,
)
def reschedule_appointment(
    appointment_id: AppointmentId,
    data: AdminAppointmentReschedule,
    session: SessionDep,
    now: NowDep,
) -> AdminAppointmentResponse:
    """Muda o início e, se pedido, o barbeiro, sem prazo (RN-15, RN-21, RN-22)."""
    entry = service.reschedule_admin_appointment(
        session,
        appointment_id,
        starts_at=data.starts_at,
        barber_id=data.barber_id,
        now=now,
    )
    return to_response(entry)


@router.get(
    "/appointments/{appointment_id}/availability/days",
    response_model=AvailableDaysResponse,
)
def get_reschedule_days(
    appointment_id: AppointmentId,
    session: SessionDep,
    now: NowDep,
    barber_id: OptionalBarber = None,
) -> AvailableDaysResponse:
    """Dias com horário para remarcar, com a política da administração."""
    target, days = service.reschedule_days(
        session, appointment_id, barber_id=barber_id, now=now
    )
    return AvailableDaysResponse(
        barber_id=target.barber_id, service_id=target.service_id, days=days
    )


@router.get(
    "/appointments/{appointment_id}/availability",
    response_model=AvailabilityResponse,
)
def get_reschedule_slots(
    appointment_id: AppointmentId,
    day: LocalDate,
    session: SessionDep,
    now: NowDep,
    barber_id: OptionalBarber = None,
) -> AvailabilityResponse:
    """Horários de um dia para remarcar, com a política da administração. O
    próprio agendamento não ocupa a agenda, e o horário atual não aparece."""
    target, slots = service.reschedule_slots(
        session, appointment_id, barber_id=barber_id, day=day, now=now
    )
    return AvailabilityResponse(
        barber_id=target.barber_id,
        service_id=target.service_id,
        date=day,
        slots=_slots(slots),
    )
