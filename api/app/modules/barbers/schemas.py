"""Contrato HTTP do cadastro de barbeiros (RN-60)."""

from typing import Annotated, Self

from pydantic import BaseModel, BeforeValidator, StringConstraints, model_validator

from app.modules.barbers.models import (
    BIO_MAX_LENGTH,
    NAME_MAX_LENGTH,
    PHOTO_PATH_MAX_LENGTH,
)

# Fotos estáticas em `web/public/images/barbeiros/` (D10).
PHOTO_PATH_PATTERN = r"^/images/barbeiros/[a-z0-9]+(-[a-z0-9]+)*\.(jpg|jpeg|png|webp)$"


def _strip(value: object) -> object:
    return value.strip() if isinstance(value, str) else value


def _blank_to_none(value: object) -> object:
    """Campo opcional enviado vazio pelo formulário vira ausência de valor."""
    value = _strip(value)
    if isinstance(value, str) and not value:
        return None
    return value


Name = Annotated[
    str,
    BeforeValidator(_strip),
    StringConstraints(min_length=1, max_length=NAME_MAX_LENGTH),
]
# As restrições ficam no `str`: o Pydantic não as aplica a um `None` opcional.
PhotoPath = Annotated[
    Annotated[
        str,
        StringConstraints(max_length=PHOTO_PATH_MAX_LENGTH, pattern=PHOTO_PATH_PATTERN),
    ]
    | None,
    BeforeValidator(_blank_to_none),
]
Bio = Annotated[
    Annotated[str, StringConstraints(max_length=BIO_MAX_LENGTH)] | None,
    BeforeValidator(_blank_to_none),
]


class BarberCreate(BaseModel):
    name: Name
    photo_path: PhotoPath = None
    bio: Bio = None


class BarberUpdate(BaseModel):
    """Só os campos enviados mudam; foto e apresentação aceitam `null` para limpar."""

    name: Name | None = None
    photo_path: PhotoPath = None
    bio: Bio = None
    active: bool | None = None

    @model_validator(mode="after")
    def _required_fields_are_not_cleared(self) -> Self:
        """Nome e situação são obrigatórios: `null` explícito não os apaga."""
        for field in ("name", "active"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"O campo {field} não pode ser vazio.")
        return self


class BarberResponse(BaseModel):
    id: int
    name: str
    photo_path: str | None
    bio: str | None
    active: bool


class PublicBarberResponse(BaseModel):
    """Barbeiro na vitrine: só os ativos aparecem, então não há `active`."""

    id: int
    name: str
    photo_path: str | None
    bio: str | None
