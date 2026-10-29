"""Contrato HTTP do agendamento pelo cliente."""

from datetime import datetime

from pydantic import AwareDatetime, BaseModel, ConfigDict

from app.modules.appointments.models import AppointmentStatus
from app.modules.catalog.schemas import Money


class AppointmentCreate(BaseModel):
    """O cliente vem do token (RN-16): o corpo não aceita `customer_id`."""

    model_config = ConfigDict(extra="forbid")

    barber_id: int
    service_id: int
    # Um dos inícios de `GET /public/availability`, com o fuso (RN-01).
    starts_at: AwareDatetime


class AppointmentBarber(BaseModel):
    id: int
    name: str


class AppointmentService(BaseModel):
    id: int
    name: str


class CustomerAppointmentResponse(BaseModel):
    """Agendamento do próprio cliente. Início e fim no fuso de São Paulo
    (`-03:00`, RN-01); preço e duração congelados na criação (RN-13)."""

    id: int
    status: AppointmentStatus
    barber: AppointmentBarber
    service: AppointmentService
    starts_at: datetime
    ends_at: datetime
    price: Money
    duration_minutes: int
