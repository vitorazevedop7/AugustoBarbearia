"""Rotas `/me/appointments`: os agendamentos do próprio cliente (RN-16, RN-70)."""

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.clock import TIMEZONE, utc_now
from app.db import get_session
from app.errors import ErrorResponse
from app.modules.booking import service
from app.modules.booking.schemas import (
    AppointmentBarber,
    AppointmentCreate,
    AppointmentService,
    CustomerAppointmentResponse,
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


def to_response(booked: service.CustomerAppointment) -> CustomerAppointmentResponse:
    appointment = booked.appointment
    return CustomerAppointmentResponse(
        id=appointment.id,
        status=appointment.status,
        barber=AppointmentBarber(id=booked.barber.id, name=booked.barber.name),
        service=AppointmentService(id=booked.service.id, name=booked.service.name),
        # RN-01: o banco devolve UTC; a resposta sai no fuso de São Paulo.
        starts_at=appointment.starts_at.astimezone(TIMEZONE),
        ends_at=appointment.ends_at.astimezone(TIMEZONE),
        price=appointment.price,
        duration_minutes=appointment.duration_minutes,
    )


@router.post(
    "",
    response_model=CustomerAppointmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_appointment(
    data: AppointmentCreate,
    customer: Annotated[Customer, Depends(current_customer)],
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(utc_now)],
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
    return to_response(booked)
