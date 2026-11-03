"""Contrato HTTP do agendamento pelo cliente."""

from datetime import datetime

from pydantic import AwareDatetime, BaseModel, ConfigDict

from app.ids import Id
from app.modules.appointments.models import AppointmentStatus, CanceledBy
from app.modules.catalog.schemas import Money


class AppointmentCreate(BaseModel):
    """O cliente vem do token (RN-16): o corpo não aceita `customer_id`."""

    model_config = ConfigDict(extra="forbid")

    barber_id: Id
    service_id: Id
    # Um dos inícios de `GET /public/availability`, com o fuso (RN-01).
    starts_at: AwareDatetime


class AppointmentBarber(BaseModel):
    id: int
    name: str


class AppointmentService(BaseModel):
    id: int
    name: str


class AppointmentReschedule(BaseModel):
    """RN-15: muda o início e, se o cliente quiser, o barbeiro. O serviço não
    muda, então o corpo não aceita `service_id`."""

    model_config = ConfigDict(extra="forbid")

    # Um dos inícios de `GET /me/appointments/{id}/availability`, com o fuso.
    starts_at: AwareDatetime
    # Sem ele, o barbeiro continua o mesmo.
    barber_id: Id | None = None


class CustomerAppointmentResponse(BaseModel):
    """Agendamento do próprio cliente. Datas no fuso de São Paulo (`-03:00`,
    RN-01); preço e duração congelados na criação (RN-13)."""

    id: int
    status: AppointmentStatus
    barber: AppointmentBarber
    service: AppointmentService
    starts_at: datetime
    ends_at: datetime
    price: Money
    duration_minutes: int
    # RN-33: quando e quem cancelou; `null` se não foi cancelado.
    canceled_at: datetime | None
    canceled_by: CanceledBy | None
    # RN-14: até quando o cliente pode cancelar ou remarcar: o início.
    # `null` quando o agendamento não está ativo.
    change_deadline: datetime | None
    # Calculados pela API (RN-14, RN-31): o web só mostra ou esconde as ações.
    can_cancel: bool
    can_reschedule: bool
    # RN-14: alterar agora é em cima da hora (nas 2 horas antes do início). As
    # ações continuam disponíveis; o web mostra o aviso.
    late_change: bool


class CustomerChangeResponse(CustomerAppointmentResponse):
    """O agendamento depois de cancelar ou remarcar (RN-14)."""

    # Esta ação foi em cima da hora (nas 2 horas antes do horário deixado):
    # o web escolhe o aviso de agradecimento.
    changed_late: bool


class CustomerAppointmentsResponse(BaseModel):
    """Os agendamentos do próprio cliente (RN-16)."""

    # `SCHEDULED` que ainda não terminaram, do mais próximo ao mais distante.
    upcoming: list[CustomerAppointmentResponse]
    # Todos os outros, do mais recente ao mais antigo.
    history: list[CustomerAppointmentResponse]
