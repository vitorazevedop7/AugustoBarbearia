"""Contrato do perfil do cliente e da identidade em `GET /me`."""

import re
from typing import Annotated

from pydantic import (
    AfterValidator,
    BaseModel,
    BeforeValidator,
    ConfigDict,
    StringConstraints,
)

from app.auth.schemas import CurrentUser
from app.modules.customers.models import EMAIL_MAX_LENGTH, NAME_MAX_LENGTH

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
# Só confere o formato (algo@dominio.tld): quem confirma o e-mail é o Google.
EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


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


def normalize_email(email: str) -> str:
    """RN-23: e-mails iguais a menos de espaços e caixa são o mesmo cadastro."""
    return email.strip().lower()


def _normalize_optional_email(value: object) -> object:
    """Normaliza o e-mail (RN-23); campo vazio vira ausência de e-mail."""
    if not isinstance(value, str):
        return value
    return normalize_email(value) or None


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


# As restrições ficam no `str`: o Pydantic não as aplica a um `None` opcional.
OptionalEmail = Annotated[
    Annotated[
        str, StringConstraints(max_length=EMAIL_MAX_LENGTH, pattern=EMAIL_PATTERN)
    ]
    | None,
    BeforeValidator(_normalize_optional_email),
]


class CustomerCreate(BaseModel):
    """Cliente cadastrado pela administração, sem conta Google (RN-20, RN-62)."""

    model_config = ConfigDict(extra="forbid")

    name: Name
    phone: Phone
    email: OptionalEmail = None


class CustomerUpdate(BaseModel):
    """`name` e `phone` ausentes ou `null` ficam como estão (RN-62). `email`
    enviado vazio ou `null` apaga o e-mail; ausente, mantém."""

    model_config = ConfigDict(extra="forbid")

    name: Name | None = None
    phone: Phone | None = None
    email: OptionalEmail = None


class CustomerResponse(BaseModel):
    id: int
    name: str
    phone: str | None
    email: str | None
    # Só se existe vínculo com uma conta Google; o `sub` não sai da API.
    has_account: bool


class CustomerPage(BaseModel):
    items: list[CustomerResponse]
    total: int
    page: int
    page_size: int
