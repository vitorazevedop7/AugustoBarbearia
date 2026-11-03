"""Contrato HTTP do cadastro de serviços (RN-61).

Aqui fica só o formato dos campos. As regras da RN-61 (preço ≥ 0, duração
múltipla de 5 e de no mínimo 10 minutos, pelo menos um barbeiro) ficam no
service, com mensagens próprias.
"""

import re
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

from app.errors import InvalidInput
from app.ids import Id
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


# Os formatos aceitos (#146), só com algarismos ASCII. Com vírgula, ela é o
# separador decimal, e o ponto, o de milhar em grupos de 3 ("1.000,00"). Sem
# vírgula, o ponto só pode ser o decimal, com até 2 casas ("25.50").
COMMA_DECIMAL = re.compile(r"-?(?:[0-9]{1,3}(?:\.[0-9]{3})+|[0-9]+),[0-9]{1,2}")
DOT_DECIMAL = re.compile(r"-?[0-9]+(?:\.[0-9]{1,2})?")
MONEY_FORMAT_MESSAGE = (
    "Informe o valor em reais com até duas casas decimais, como 25, 25,50 ou 1.000,00."
)


def _decimal_text(value: object) -> object:
    """Aceita o valor como se digita: "25", "25,50", "25.50" e "1.000,00".

    Recusa o que mudaria o valor em silêncio (#146): "1.000" (em pt-BR é mil,
    mas leria 1,00), "25.5000", "1,000.00", notação científica ("1e3") e
    algarismos de outros sistemas. O sinal é conferido pelo service (RN-61,
    RN-40). Inteiro segue direto para o `Decimal`. Número JSON com casas já
    chega como `float` e é recusado antes da conversão, para não aceitar um
    valor arredondado (RN-61).
    """
    if isinstance(value, float):
        raise ValueError('Envie o valor como texto decimal, por exemplo "25.50".')
    value = _strip(value)
    if not isinstance(value, str):
        return value
    if COMMA_DECIMAL.fullmatch(value):
        return value.replace(".", "").replace(",", ".")
    if DOT_DECIMAL.fullmatch(value):
        return value
    raise InvalidInput(MONEY_FORMAT_MESSAGE)


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
    BeforeValidator(_decimal_text, json_schema_input_type=str | int),
    Field(max_digits=10, decimal_places=2),
]
DurationMinutes = Annotated[int, Field(le=MAX_DURATION_MINUTES)]
Money = Annotated[Decimal, PlainSerializer(_money_text, return_type=str)]


class ServiceCreate(BaseModel):
    name: Name
    description: Description = None
    price: Price
    duration_minutes: DurationMinutes
    barber_ids: list[Id]


class ServiceUpdate(BaseModel):
    """Só os campos enviados mudam; `barber_ids` substitui a lista inteira e a
    descrição aceita `null` para limpar."""

    name: Name | None = None
    description: Description = None
    price: Price | None = None
    duration_minutes: DurationMinutes | None = None
    barber_ids: list[Id] | None = None
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


class PublicServiceBarber(BaseModel):
    """Barbeiro ativo que realiza o serviço, como a vitrine o mostra."""

    id: int
    name: str


class PublicServiceResponse(BaseModel):
    """Serviço na vitrine: só os ativos aparecem, então não há `active`."""

    id: int
    name: str
    description: str | None
    price: Money
    duration_minutes: int
    barbers: list[PublicServiceBarber]
