"""Contrato HTTP dos horários disponíveis (RN-05)."""

import datetime as dt

from pydantic import BaseModel


class AvailableSlot(BaseModel):
    """Um horário de início e o fim do atendimento, com o fuso de São Paulo
    (`-03:00`, RN-01)."""

    starts_at: dt.datetime
    ends_at: dt.datetime


class AvailabilityResponse(BaseModel):
    barber_id: int
    service_id: int
    # Data local de São Paulo consultada.
    date: dt.date
    # Em ordem; vazia quando o dia não tem horário.
    slots: list[AvailableSlot]


class AvailableDaysResponse(BaseModel):
    barber_id: int
    service_id: int
    # Datas locais de São Paulo, em ordem, de hoje até o fim da janela (RN-07),
    # só as que têm pelo menos um horário disponível.
    days: list[dt.date]
