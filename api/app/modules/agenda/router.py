"""Rotas `/admin/appointments`: a agenda da administração (RN-70)."""

import datetime as dt
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.dependencies import require_admin
from app.clock import TIMEZONE
from app.db import get_session
from app.errors import ErrorResponse
from app.ids import Id
from app.modules.agenda import service
from app.modules.agenda.schemas import (
    AdminAppointmentResponse,
    AgendaBarber,
    AgendaCustomer,
    AgendaDay,
    AgendaResponse,
    AgendaService,
)
from app.modules.barbers.models import Barber
from app.modules.payments.schemas import PaymentResponse

router = APIRouter(
    prefix="/admin/appointments",
    tags=["Agenda"],
    dependencies=[Depends(require_admin)],
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
    },
)

SessionDep = Annotated[Session, Depends(get_session)]


def _local(moment: dt.datetime | None) -> dt.datetime | None:
    # RN-01: o banco devolve UTC; a resposta sai no fuso de São Paulo.
    return moment.astimezone(TIMEZONE) if moment is not None else None


def _barber(barber: Barber) -> AgendaBarber:
    return AgendaBarber(id=barber.id, name=barber.name, active=barber.active)


def to_response(entry: service.AgendaEntry) -> AdminAppointmentResponse:
    appointment = entry.appointment
    return AdminAppointmentResponse(
        id=appointment.id,
        status=appointment.status,
        source=appointment.source,
        customer=AgendaCustomer(
            id=entry.customer.id,
            name=entry.customer.name,
            phone=entry.customer.phone,
            email=entry.customer.email,
        ),
        barber=_barber(entry.barber),
        service=AgendaService(id=entry.service.id, name=entry.service.name),
        starts_at=appointment.starts_at.astimezone(TIMEZONE),
        ends_at=appointment.ends_at.astimezone(TIMEZONE),
        price=appointment.price,
        duration_minutes=appointment.duration_minutes,
        canceled_at=_local(appointment.canceled_at),
        canceled_by=appointment.canceled_by,
        closed_at=_local(appointment.closed_at),
        closed_by=appointment.closed_by,
        payment=(
            PaymentResponse(amount=entry.payment.amount, method=entry.payment.method)
            if entry.payment is not None
            else None
        ),
    )


@router.get("", response_model=AgendaResponse)
def list_appointments(
    start: Annotated[dt.date, Query(description="Data local de São Paulo.")],
    end: Annotated[dt.date, Query(description="Data local de São Paulo, inclusiva.")],
    session: SessionDep,
    barber_id: Id | None = None,
) -> AgendaResponse:
    """Os agendamentos que começam no período (até 7 dias), em todos os
    status, com o horário de funcionamento de cada dia (RN-01, RN-02, RN-30)."""
    agenda = service.list_agenda(session, start=start, end=end, barber_id=barber_id)
    return AgendaResponse(
        start=start,
        end=end,
        days=[
            AgendaDay(date=day.date, opens_at=day.opens_at, closes_at=day.closes_at)
            for day in agenda.days
        ],
        barbers=[_barber(barber) for barber in agenda.barbers],
        appointments=[to_response(entry) for entry in agenda.entries],
    )


@router.get("/{appointment_id}", response_model=AdminAppointmentResponse)
def get_appointment(
    appointment_id: Id, session: SessionDep
) -> AdminAppointmentResponse:
    """Um agendamento de qualquer cliente (RN-70)."""
    return to_response(service.get_admin_appointment(session, appointment_id))
