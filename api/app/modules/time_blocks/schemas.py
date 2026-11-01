"""Contrato HTTP dos bloqueios (RN-03)."""

from datetime import date, datetime, time
from typing import Annotated

from pydantic import BaseModel, BeforeValidator, Field, StringConstraints

from app.modules.agenda.schemas import AgendaBarber
from app.modules.time_blocks.models import REASON_MAX_LENGTH


def _blank_to_none(value: object) -> object:
    """Motivo aparado; enviado vazio pelo formulário vira ausência de valor."""
    if isinstance(value, str):
        value = value.strip()
        return value or None
    return value


# As restrições ficam no `str`: o Pydantic não as aplica a um `None` opcional.
Reason = Annotated[
    Annotated[str, StringConstraints(max_length=REASON_MAX_LENGTH)] | None,
    BeforeValidator(_blank_to_none),
]


class TimeBlockCreate(BaseModel):
    """Um bloqueio dentro de um dia, em horário local de São Paulo (RN-01).

    Com `all_day`, é folga do dia inteiro (RN-03) e os horários são
    ignorados; sem ele, `start_time` e `end_time` são obrigatórios.
    """

    barber_id: int
    date: date
    all_day: bool = False
    start_time: time | None = Field(default=None, description="Hora local, HH:MM.")
    end_time: time | None = Field(default=None, description="Hora local, HH:MM.")
    reason: Reason = None


class TimeBlockResponse(BaseModel):
    """Um bloqueio. Datas no fuso de São Paulo (`-03:00`, RN-01); o intervalo é
    `[starts_at, ends_at)`. `all_day` vale para a folga da meia-noite à
    meia-noite seguinte."""

    id: int
    barber: AgendaBarber
    starts_at: datetime
    ends_at: datetime
    all_day: bool
    reason: str | None
