"""Rotas `/me/appointments`: os agendamentos do próprio cliente (RN-16, RN-70)."""

import datetime as dt
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.clock import TIMEZONE, utc_now
from app.db import get_session
from app.errors import ErrorResponse
from app.ids import Id
from app.modules.availability.schemas import (
    AvailabilityResponse,
    AvailableDaysResponse,
    AvailableSlot,
)
from app.modules.booking import service
from app.modules.booking.calendar import calendar_filename, render_ics
from app.modules.booking.schemas import (
    AppointmentBarber,
    AppointmentCreate,
    AppointmentReschedule,
    AppointmentService,
    CustomerAppointmentResponse,
    CustomerAppointmentsResponse,
    CustomerChangeResponse,
)
from app.modules.customers.dependencies import current_customer
from app.modules.customers.models import Customer
from app.modules.notifications.dependencies import OutboxDep

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
        late_change=service.late_change(appointment, now),
    )


def to_change_response(
    change: service.CustomerChange, now: dt.datetime
) -> CustomerChangeResponse:
    return CustomerChangeResponse(
        **to_response(change.booked, now).model_dump(), changed_late=change.late
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
        can_book=service.can_book_more(session, customer.id, now),
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
    outbox: OutboxDep,
) -> CustomerAppointmentResponse:
    """Agenda um horário para o cliente do token (RN-05 a RN-13) e envia a
    confirmação por e-mail (RN-50)."""
    booked = service.create_customer_appointment(
        session,
        customer,
        barber_id=data.barber_id,
        service_id=data.service_id,
        starts_at=data.starts_at,
        now=now,
        outbox=outbox,
    )
    return to_response(booked, now)


@router.get("/{appointment_id}", response_model=CustomerAppointmentResponse)
def get_appointment(
    appointment_id: Id, customer: CustomerDep, session: SessionDep, now: NowDep
) -> CustomerAppointmentResponse:
    """Um agendamento do cliente do token. O de outro cliente responde 404
    (RN-16)."""
    booked = service.get_customer_appointment(session, customer.id, appointment_id)
    return to_response(booked, now)


@router.get(
    "/{appointment_id}/calendar.ics",
    response_class=Response,
    responses={
        200: {
            "description": "O agendamento como evento de calendário (RFC 5545).",
            "content": {"text/calendar": {"schema": {"type": "string"}}},
        },
    },
)
def get_appointment_calendar(
    appointment_id: Id, customer: CustomerDep, session: SessionDep
) -> Response:
    """O agendamento ativo do cliente do token como arquivo `.ics` (RN-16,
    RN-31). O de outro cliente responde 404; o que não está mais ativo, 409."""
    booked, address = service.get_calendar_appointment(
        session, customer.id, appointment_id
    )
    content = render_ics(
        booked.appointment,
        barber=booked.barber,
        service=booked.service,
        address=address,
    )
    return Response(
        content=content,
        media_type="text/calendar; charset=utf-8",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{calendar_filename(appointment_id)}"'
            )
        },
    )


@router.post("/{appointment_id}/cancel", response_model=CustomerChangeResponse)
def cancel_appointment(
    appointment_id: Id,
    customer: CustomerDep,
    session: SessionDep,
    now: NowDep,
    outbox: OutboxDep,
) -> CustomerChangeResponse:
    """Cancela até o início (RN-14, RN-31 a RN-33) e avisa por e-mail (RN-52).
    `changed_late` diz se foi nas últimas 2 horas."""
    change = service.cancel_customer_appointment(
        session, customer.id, appointment_id, now, outbox=outbox
    )
    return to_change_response(change, now)


@router.post("/{appointment_id}/reschedule", response_model=CustomerChangeResponse)
def reschedule_appointment(
    appointment_id: Id,
    data: AppointmentReschedule,
    customer: CustomerDep,
    session: SessionDep,
    now: NowDep,
    outbox: OutboxDep,
) -> CustomerChangeResponse:
    """Muda o início e, se pedido, o barbeiro, até o início do horário atual
    (RN-14, RN-15, RN-05 a RN-08), e avisa por e-mail (RN-52). `changed_late`
    diz se foi nas últimas 2 horas."""
    change = service.reschedule_customer_appointment(
        session,
        customer.id,
        appointment_id,
        starts_at=data.starts_at,
        barber_id=data.barber_id,
        now=now,
        outbox=outbox,
    )
    return to_change_response(change, now)


@router.get("/{appointment_id}/availability/days", response_model=AvailableDaysResponse)
def get_reschedule_days(
    appointment_id: Id,
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
    appointment_id: Id,
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
