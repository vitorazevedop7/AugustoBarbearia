"""Contrato HTTP da agenda da administração."""

from datetime import date, datetime, time

from pydantic import BaseModel

from app.modules.appointments.models import (
    AppointmentSource,
    AppointmentStatus,
    CanceledBy,
)
from app.modules.catalog.schemas import Money


class AgendaCustomer(BaseModel):
    """O cliente do agendamento, com o contato para a barbearia ligar."""

    id: int
    name: str
    # Só dígitos (DDD + número). Um cliente Google pode ainda não ter (RN-10).
    phone: str | None
    email: str | None


class AgendaBarber(BaseModel):
    id: int
    name: str
    active: bool


class AgendaService(BaseModel):
    id: int
    name: str


class AdminAppointmentResponse(BaseModel):
    """Um agendamento visto pela administração. Datas no fuso de São Paulo
    (`-03:00`, RN-01); preço e duração congelados na criação (RN-13)."""

    id: int
    status: AppointmentStatus
    source: AppointmentSource
    customer: AgendaCustomer
    barber: AgendaBarber
    service: AgendaService
    starts_at: datetime
    ends_at: datetime
    price: Money
    duration_minutes: int
    # RN-33: quando e quem cancelou; `null` se não foi cancelado.
    canceled_at: datetime | None
    canceled_by: CanceledBy | None


class AgendaDay(BaseModel):
    """Um dia do período com o horário de funcionamento (RN-02): a moldura da
    agenda. Abertura e fechamento vazios = fechado. Horas locais de São Paulo."""

    date: date
    opens_at: time | None
    closes_at: time | None


class AgendaResponse(BaseModel):
    """O período pedido: os dias, os barbeiros e os agendamentos."""

    start: date
    end: date
    # Um por data, de `start` a `end`.
    days: list[AgendaDay]
    # Sem filtro, os ativos e os inativos com agendamento no período; com
    # filtro, só o barbeiro pedido. Por nome.
    barbers: list[AgendaBarber]
    # Todos os status (RN-30), por início, nome do barbeiro e id.
    appointments: list[AdminAppointmentResponse]
