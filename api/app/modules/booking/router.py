"""Rotas `/me/appointments`: os agendamentos do próprio cliente (RN-16, RN-70)."""

import datetime as dt
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.clock import TIMEZONE, utc_now
from app.db import get_session
from app.errors import ErrorResponse
from app.modules.availability.schemas import (
    AvailabilityResponse,
    AvailableDaysResponse,
    AvailableSlot,
)
from app.modules.booking import service
from app.modules.booking.schemas import (
    AppointmentBarber,
    AppointmentCreate,
    AppointmentReschedule,
    AppointmentService,
    CustomerAppointmentResponse,
    CustomerAppointmentsResponse,
)
from app.modules.customers.dependencies import current_customer
from app.modules.customers.models import Customer

router = APIRouter(
    prefix="/me/appointments",
    tags=["Agendamento"],
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        409: {"model": ErrorResponse},
    },
)

CustomerDep = Annotated[Customer, Depends(current_customer)]
SessionDep = Annotated[Session, Depends(get_session)]
NowDep = Annotated[dt.datetime, Depends(utc_now)]


def _local(moment: dt.datetime | None) -> dt.datetime | None:
    # RN-01: o banco devolve UTC; a resposta sai no fuso de São Paulo.
    return moment.astimezone(TIMEZONE) if moment is not None else None


def to_response(
    booked: service.CustomerAppointment, now: dt.datetime
) -> CustomerAppointmentResponse:
    appointment = booked.appointment
    changeable = service.can_change(appointment, now)
    return CustomerAppointmentResponse(
        id=appointment.id,
        status=appointment.status,
        barber=AppointmentBarber(id=booked.barber.id, name=booked.barber.name),
        service=AppointmentService(id=booked.service.id, name=booked.service.name),
        starts_at=appointment.starts_at.astimezone(TIMEZONE),
        ends_at=appointment.ends_at.astimezone(TIMEZONE),
        price=appointment.price,
        duration_minutes=appointment.duration_minutes,
        canceled_at=_local(appointment.canceled_at),
        canceled_by=appointment.canceled_by,
        change_deadline=_local(service.change_deadline(appointment)),
        # RN-14: as duas ações seguem o mesmo prazo.
        can_cancel=changeable,
        can_reschedule=changeable,
    )


@router.get("", response_model=CustomerAppointmentsResponse)
def list_appointments(
    customer: CustomerDep, session: SessionDep, now: NowDep
) -> CustomerAppointmentsResponse:
    """Os agendamentos do cliente do token, em próximos e histórico (RN-16)."""
    upcoming, history = service.list_customer_appointments(session, customer.id, now)
    return CustomerAppointmentsResponse(
        upcoming=[to_response(item, now) for item in upcoming],
        history=[to_response(item, now) for item in history],
    )


@router.post(
    "",
    response_model=CustomerAppointmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_appointment(
    data: AppointmentCreate,
    customer: CustomerDep,
    session: SessionDep,
    now: NowDep,
) -> CustomerAppointmentResponse:
    """Agenda um horário para o cliente do token (RN-05 a RN-13)."""
    booked = service.create_customer_appointment(
        session,
        customer,
        barber_id=data.barber_id,
        service_id=data.service_id,
        starts_at=data.starts_at,
        now=now,
    )
    return to_response(booked, now)


@router.get("/{appointment_id}", response_model=CustomerAppointmentResponse)
def get_appointment(
    appointment_id: int, customer: CustomerDep, session: SessionDep, now: NowDep
) -> CustomerAppointmentResponse:
    """Um agendamento do cliente do token. O de outro cliente responde 404
    (RN-16)."""
    booked = service.get_customer_appointment(session, customer.id, appointment_id)
    return to_response(booked, now)


@router.post("/{appointment_id}/cancel", response_model=CustomerAppointmentResponse)
def cancel_appointment(
    appointment_id: int, customer: CustomerDep, session: SessionDep, now: NowDep
) -> CustomerAppointmentResponse:
    """Cancela até 2 horas antes do início (RN-14, RN-31 a RN-33)."""
    booked = service.cancel_customer_appointment(
        session, customer.id, appointment_id, now
    )
    return to_response(booked, now)


@router.post("/{appointment_id}/reschedule", response_model=CustomerAppointmentResponse)
def reschedule_appointment(
    appointment_id: int,
    data: AppointmentReschedule,
    customer: CustomerDep,
    session: SessionDep,
    now: NowDep,
) -> CustomerAppointmentResponse:
    """Muda o início e, se pedido, o barbeiro, até 2 horas antes (RN-14,
    RN-15, RN-05 a RN-08)."""
    booked = service.reschedule_customer_appointment(
        session,
        customer.id,
        appointment_id,
        starts_at=data.starts_at,
        barber_id=data.barber_id,
        now=now,
    )
    return to_response(booked, now)


@router.get("/{appointment_id}/availability/days", response_model=AvailableDaysResponse)
def get_reschedule_days(
    appointment_id: int,
    customer: CustomerDep,
    session: SessionDep,
    now: NowDep,
    barber_id: Annotated[
        int | None, Query(description="Sem ele, o barbeiro atual.")
    ] = None,
) -> AvailableDaysResponse:
    """Dias com horário para remarcar o agendamento (RN-05 a RN-07, RN-15)."""
    target, days = service.reschedule_days(
        session, customer.id, appointment_id, barber_id=barber_id, now=now
    )
    return AvailableDaysResponse(
        barber_id=target.barber_id, service_id=target.service_id, days=days
    )


@router.get("/{appointment_id}/availability", response_model=AvailabilityResponse)
def get_reschedule_slots(
    appointment_id: int,
    day: Annotated[
        dt.date, Query(alias="date", description="Data local de São Paulo.")
    ],
    customer: CustomerDep,
    session: SessionDep,
    now: NowDep,
    barber_id: Annotated[
        int | None, Query(description="Sem ele, o barbeiro atual.")
    ] = None,
) -> AvailabilityResponse:
    """Horários de um dia para remarcar o agendamento (RN-05 a RN-07, RN-15).
    O próprio agendamento não ocupa a agenda, e o horário atual não aparece."""
    target, slots = service.reschedule_slots(
        session, customer.id, appointment_id, barber_id=barber_id, day=day, now=now
    )
    return AvailabilityResponse(
        barber_id=target.barber_id,
        service_id=target.service_id,
        date=day,
        slots=[AvailableSlot(starts_at=slot.start, ends_at=slot.end) for slot in slots],
    )
