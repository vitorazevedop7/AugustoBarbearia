"""Dados de apoio para os testes de agendamento e disponibilidade."""

from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.clock import TIMEZONE
from app.modules.appointments.models import (
    Appointment,
    AppointmentSource,
    AppointmentStatus,
    CanceledBy,
)
from app.modules.barbers.models import Barber
from app.modules.catalog.models import Service
from app.modules.customers.models import Customer


def local(year: int, month: int, day: int, hour: int, minute: int = 0) -> datetime:
    """Um instante dado em hora de São Paulo (RN-01)."""
    return datetime(year, month, day, hour, minute, tzinfo=TIMEZONE)


def barber_id(session: Session, name: str) -> int:
    found = session.scalar(select(Barber.id).where(Barber.name == name))
    assert found is not None
    return found


def service_by_name(session: Session, name: str) -> Service:
    found = session.scalar(select(Service).where(Service.name == name))
    assert found is not None
    return found


def make_customer(session: Session) -> Customer:
    customer = Customer(name="Cliente de Teste", phone="75999990000")
    session.add(customer)
    session.flush()
    return customer


def make_appointment(
    session: Session,
    *,
    barber: int,
    starts_at: datetime,
    duration_minutes: int = 45,
    price: Decimal = Decimal("35.00"),
    status: AppointmentStatus = AppointmentStatus.SCHEDULED,
    service: Service | None = None,
    customer: Customer | None = None,
) -> Appointment:
    """Grava um agendamento direto no banco; a criação pela API é da S3.08."""
    service = service or service_by_name(session, "Corte + Barba")
    customer = customer or make_customer(session)
    canceled = status == AppointmentStatus.CANCELED
    appointment = Appointment(
        customer_id=customer.id,
        barber_id=barber,
        service_id=service.id,
        starts_at=starts_at,
        ends_at=starts_at + timedelta(minutes=duration_minutes),
        price=price,
        duration_minutes=duration_minutes,
        status=status,
        source=AppointmentSource.ONLINE,
        canceled_at=starts_at - timedelta(days=1) if canceled else None,
        canceled_by=CanceledBy.CUSTOMER if canceled else None,
    )
    session.add(appointment)
    session.flush()
    return appointment
