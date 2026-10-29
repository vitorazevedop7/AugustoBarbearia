"""Contrato HTTP da barbearia e do horário de funcionamento."""

import re
from datetime import time
from typing import Annotated

from pydantic import (
    AfterValidator,
    BaseModel,
    BeforeValidator,
    Field,
    StringConstraints,
)


def _blank_to_none(value: object) -> object:
    """Campo opcional enviado vazio pelo formulário vira ausência de valor."""
    if isinstance(value, str):
        value = value.strip()
        return value or None
    return value


def _phone_digits(value: object) -> object:
    """Aceita "(75) 99999-0000" e guarda só os dígitos (DDD + número)."""
    value = _blank_to_none(value)
    if isinstance(value, str):
        digits = re.sub(r"\D", "", value)
        if len(digits) not in (10, 11):
            raise ValueError("O telefone precisa ter DDD e número.")
        return digits
    return value


def _instagram_handle(value: object) -> object:
    value = _blank_to_none(value)
    if isinstance(value, str):
        return value.removeprefix("@")
    return value


def _whole_minutes(value: time | None) -> time | None:
    if value is not None and (value.second or value.microsecond or value.tzinfo):
        raise ValueError("Informe a hora em horas e minutos, sem fuso.")
    return value


# As restrições ficam no `str`: o Pydantic não as aplica a um `None` opcional.
Tagline = Annotated[
    Annotated[str, StringConstraints(max_length=160)] | None,
    BeforeValidator(_blank_to_none),
]
About = Annotated[
    Annotated[str, StringConstraints(max_length=1000)] | None,
    BeforeValidator(_blank_to_none),
]
Address = Annotated[
    Annotated[str, StringConstraints(max_length=200)] | None,
    BeforeValidator(_blank_to_none),
]
Phone = Annotated[
    Annotated[str, StringConstraints(pattern=r"^\d{10,11}$")] | None,
    BeforeValidator(_phone_digits),
]
Instagram = Annotated[
    Annotated[str, StringConstraints(pattern=r"^[A-Za-z0-9._]{1,30}$")] | None,
    BeforeValidator(_instagram_handle),
]
Email = Annotated[
    Annotated[
        str,
        StringConstraints(max_length=254, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$"),
    ]
    | None,
    BeforeValidator(_blank_to_none),
]
LocalTime = Annotated[time | None, AfterValidator(_whole_minutes)]


class ShopData(BaseModel):
    name: Annotated[str, Field(min_length=1, max_length=80)]
    tagline: Tagline = None
    about: About = None
    address: Address = None
    phone: Phone = None
    whatsapp: Phone = None
    instagram: Instagram = None
    email: Email = None


class ShopUpdate(ShopData):
    """Substitui todos os dados da barbearia; o nome é aparado antes de validar."""

    name: Annotated[
        str, BeforeValidator(_blank_to_none), Field(min_length=1, max_length=80)
    ]


class BusinessHoursDay(BaseModel):
    """Um dia da semana (0 = segunda … 6 = domingo); horas nulas = fechado."""

    weekday: Annotated[int, Field(ge=0, le=6)]
    opens_at: LocalTime = None
    closes_at: LocalTime = None


class ShopResponse(ShopData):
    business_hours: list[BusinessHoursDay]
