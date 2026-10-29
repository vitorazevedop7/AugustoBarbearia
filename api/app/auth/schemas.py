"""Identidade validada e respostas das rotas de prova de autenticação."""

from typing import Annotated, Literal

from pydantic import BaseModel, StringConstraints, field_validator

IdentityString = Annotated[str, StringConstraints(strict=True, min_length=1)]


class TokenIdentity(BaseModel):
    sub: IdentityString
    email: IdentityString
    name: IdentityString

    @field_validator("sub", "email", "name")
    @classmethod
    def reject_blank_identity(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("O claim de identidade não pode estar em branco.")
        return value


class CurrentUser(TokenIdentity):
    role: Literal["admin", "customer"]


class AdminPingResponse(BaseModel):
    status: Literal["ok"] = "ok"
