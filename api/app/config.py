"""Configuração tipada, carregada do ambiente e do .env local."""

from functools import lru_cache
from typing import Self

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_WEB_BASE_URL = "http://localhost:3000"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    database_url: str = Field(default="", min_length=1)
    app_name: str = "Augusto Barbearia API"
    auth_jwks_url: str = Field(
        default="http://localhost:3000/api/auth/jwks", min_length=1
    )
    auth_issuer: str = Field(default="http://localhost:3000", min_length=1)
    auth_audience: str = Field(default="http://localhost:3000", min_length=1)
    admin_emails: str = ""
    # E-mail via Resend (ADR 0006). Sem chave, os e-mails vão para o log.
    resend_api_key: str = ""
    email_from: str = ""
    web_base_url: str = DEFAULT_WEB_BASE_URL

    @field_validator("web_base_url")
    @classmethod
    def default_web_base_url(cls, value: str) -> str:
        """O compose repassa a variável vazia quando ela falta no `.env`."""
        return value.strip() or DEFAULT_WEB_BASE_URL

    @model_validator(mode="after")
    def require_sender_with_key(self) -> Self:
        """Com a chave do Resend, o remetente é obrigatório: sem ele, todo
        envio falharia só depois do commit."""
        if self.resend_api_key.strip() and not self.email_from.strip():
            raise ValueError("Defina EMAIL_FROM para enviar e-mails pelo Resend.")
        return self


@lru_cache
def get_settings() -> Settings:
    """Compartilha settings validados; testes podem limpar o cache."""
    return Settings()
