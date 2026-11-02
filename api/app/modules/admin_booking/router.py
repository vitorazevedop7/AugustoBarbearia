"""Rotas do agendamento pela administração (RN-20 a RN-22, RN-70).

A resposta de cada agendamento é a da agenda (`AdminAppointmentResponse`).
"""

import datetime as dt
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_admin
from app.clock import utc_now
from app.db import get_session
from app.errors import ErrorResponse
from app.ids import Id
from app.modules.admin_booking import service
from app.modules.admin_booking.schemas import (
    AdminAppointmentCreate,
    AdminAppointmentReschedule,
    AdminBookingActionResponse,
)
from app.modules.agenda.router import to_response
from app.modules.availability.schemas import (
    AvailabilityResponse,
    AvailableDaysResponse,
    AvailableSlot,
)
from app.modules.availability.slots import TimeRange
from app.modules.notifications.dependencies import OutboxDep

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
LocalDate = Annotated[
    dt.date, Query(alias="date", description="Data local de São Paulo.")
]
OptionalBarber = Annotated[Id | None, Query(description="Sem ele, o barbeiro atual.")]


def _action_response(result: service.ActionResult) -> AdminBookingActionResponse:
    return AdminBookingActionResponse(
        **to_response(result.entry).model_dump(), notified=result.notified
    )


def _slots(slots: list[TimeRange]) -> list[AvailableSlot]:
    return [AvailableSlot(starts_at=slot.start, ends_at=slot.end) for slot in slots]


@router.get("/availability", response_model=AvailabilityResponse)
def get_availability(
    barber_id: Id,
    service_id: Id,
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
    barber_id: Id, service_id: Id, session: SessionDep, now: NowDep
) -> AvailableDaysResponse:
    """Dias de hoje até hoje + 30 com pelo menos um horário (RN-21). Os 30 dias
    são só o tamanho da lista."""
    days = service.admin_days(
        session, barber_id=barber_id, service_id=service_id, now=now
    )
    return AvailableDaysResponse(barber_id=barber_id, service_id=service_id, days=days)


@router.post(
    "/appointments",
    response_model=AdminBookingActionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_appointment(
    data: AdminAppointmentCreate,
    session: SessionDep,
    now: NowDep,
    outbox: OutboxDep,
) -> AdminBookingActionResponse:
    """Agenda para um cliente já cadastrado ou novo (RN-13, RN-20, RN-21) e
    confirma por e-mail, se ele tiver e-mail (RN-50)."""
    result = service.create_admin_appointment(
        session,
        customer_id=data.customer_id,
        new_customer=data.customer,
        barber_id=data.barber_id,
        service_id=data.service_id,
        starts_at=data.starts_at,
        now=now,
        outbox=outbox,
    )
    return _action_response(result)


@router.post(
    "/appointments/{appointment_id}/cancel",
    response_model=AdminBookingActionResponse,
)
def cancel_appointment(
    appointment_id: Id,
    session: SessionDep,
    now: NowDep,
    outbox: OutboxDep,
) -> AdminBookingActionResponse:
    """Cancela qualquer agendamento ativo, sem prazo (RN-22, RN-31 a RN-33), e
    avisa o cliente por e-mail (RN-52)."""
    return _action_response(
        service.cancel_admin_appointment(session, appointment_id, now, outbox=outbox)
    )


@router.post(
    "/appointments/{appointment_id}/reschedule",
    response_model=AdminBookingActionResponse,
)
def reschedule_appointment(
    appointment_id: Id,
    data: AdminAppointmentReschedule,
    session: SessionDep,
    now: NowDep,
    outbox: OutboxDep,
) -> AdminBookingActionResponse:
    """Muda o início e, se pedido, o barbeiro, sem prazo (RN-15, RN-21, RN-22), e
    avisa o cliente por e-mail (RN-52)."""
    result = service.reschedule_admin_appointment(
        session,
        appointment_id,
        starts_at=data.starts_at,
        barber_id=data.barber_id,
        now=now,
        outbox=outbox,
    )
    return _action_response(result)


@router.get(
    "/appointments/{appointment_id}/availability/days",
    response_model=AvailableDaysResponse,
)
def get_reschedule_days(
    appointment_id: Id,
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
    appointment_id: Id,
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
