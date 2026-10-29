"""Contrato HTTP do cadastro de serviços (RN-61).

Aqui fica só o formato dos campos. As regras da RN-61 (preço ≥ 0, duração
múltipla de 5 e de no mínimo 10 minutos, pelo menos um barbeiro) ficam no
service, com mensagens próprias.
"""

from decimal import Decimal
from typing import Annotated, Self

from pydantic import (
    BaseModel,
    BeforeValidator,
    Field,
    PlainSerializer,
    StringConstraints,
    model_validator,
)

from app.modules.catalog.models import DESCRIPTION_MAX_LENGTH, NAME_MAX_LENGTH

# Teto técnico: nenhum serviço dura mais que um dia. Evita estourar o `integer`.
MAX_DURATION_MINUTES = 24 * 60


def _strip(value: object) -> object:
    return value.strip() if isinstance(value, str) else value


def _blank_to_none(value: object) -> object:
    """Campo opcional enviado vazio pelo formulário vira ausência de valor."""
    value = _strip(value)
    if isinstance(value, str) and not value:
        return None
    return value


def _decimal_text(value: object) -> object:
    """Aceita o preço como se digita: "25,50" e "1.234,50" viram "25.50" e "1234.50".

    Com vírgula, ela é o separador decimal e o ponto é o de milhar. Sem vírgula,
    o ponto é o separador decimal. Número segue direto para o `Decimal`.
    """
    value = _strip(value)
    if isinstance(value, str) and "," in value:
        return value.replace(".", "").replace(",", ".")
    return value


def _money_text(value: Decimal) -> str:
    """Preço na resposta: string decimal com duas casas ("25.00"), nunca float."""
    return f"{value:.2f}"


Name = Annotated[
    str,
    BeforeValidator(_strip),
    StringConstraints(min_length=1, max_length=NAME_MAX_LENGTH),
]
# As restrições ficam no `str`: o Pydantic não as aplica a um `None` opcional.
Description = Annotated[
    Annotated[str, StringConstraints(max_length=DESCRIPTION_MAX_LENGTH)] | None,
    BeforeValidator(_blank_to_none),
]
# numeric(10,2). O sinal é conferido pelo service (RN-61).
Price = Annotated[
    Decimal,
    BeforeValidator(_decimal_text),
    Field(max_digits=10, decimal_places=2),
]
DurationMinutes = Annotated[int, Field(le=MAX_DURATION_MINUTES)]
Money = Annotated[Decimal, PlainSerializer(_money_text, return_type=str)]


class ServiceCreate(BaseModel):
    name: Name
    description: Description = None
    price: Price
    duration_minutes: DurationMinutes
    barber_ids: list[int]


class ServiceUpdate(BaseModel):
    """Só os campos enviados mudam; `barber_ids` substitui a lista inteira e a
    descrição aceita `null` para limpar."""

    name: Name | None = None
    description: Description = None
    price: Price | None = None
    duration_minutes: DurationMinutes | None = None
    barber_ids: list[int] | None = None
    active: bool | None = None

    @model_validator(mode="after")
    def _required_fields_are_not_cleared(self) -> Self:
        """Campos obrigatórios: `null` explícito não os apaga."""
        for field in ("name", "price", "duration_minutes", "barber_ids", "active"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"O campo {field} não pode ser vazio.")
        return self


class ServiceBarber(BaseModel):
    """Barbeiro que realiza o serviço."""

    id: int
    name: str
    active: bool


class ServiceResponse(BaseModel):
    id: int
    name: str
    description: str | None
    price: Money
    duration_minutes: int
    active: bool
    barbers: list[ServiceBarber]
