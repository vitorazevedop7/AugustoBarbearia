"""Contrato do perfil do cliente e da identidade em `GET /me`."""

import re
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, StringConstraints

from app.auth.schemas import CurrentUser
from app.modules.customers.models import NAME_MAX_LENGTH

# DDDs brasileiros em uso (Anatel).
AREA_CODES = frozenset(
    {
        *range(11, 20),
        *(21, 22, 24, 27, 28),
        *(31, 32, 33, 34, 35, 37, 38),
        *range(41, 50),
        *(51, 53, 54, 55),
        *range(61, 70),
        *(71, 73, 74, 75, 77, 79),
        *range(81, 90),
        *range(91, 100),
    }
)
SEPARATORS = re.compile(r"[\s().-]")
DIGITS = re.compile(r"[0-9]+")


def normalize_phone(value: str) -> str:
    """Formato do telefone da spec perfil-cliente (CA-7): DDD + celular ou fixo.

    Ignora separadores e o prefixo `+55` e devolve só os dígitos.
    """
    digits = SEPARATORS.sub("", value).removeprefix("+55")
    if not DIGITS.fullmatch(digits):
        raise ValueError("O telefone deve ter só números.")
    area_code, number = int(digits[:2]), digits[2:]
    is_mobile = len(number) == 9 and number[0] == "9"
    is_landline = len(number) == 8 and number[0] in "2345"
    if area_code not in AREA_CODES or not (is_mobile or is_landline):
        raise ValueError("Informe o telefone com DDD.")
    return digits


Name = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=NAME_MAX_LENGTH),
]
Phone = Annotated[
    str, StringConstraints(max_length=30), AfterValidator(normalize_phone)
]


class Me(CurrentUser):
    """Identidade autenticada e se o cadastro já permite agendar (RN-10)."""

    has_phone: bool


class CustomerProfile(BaseModel):
    name: str
    email: str | None
    phone: str | None


class CustomerProfileUpdate(BaseModel):
    """Campos ausentes ou `null` ficam como estão (RN-62: telefone não é apagado)."""

    model_config = ConfigDict(extra="forbid")

    name: Name | None = None
    phone: Phone | None = None
