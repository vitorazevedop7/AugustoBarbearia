"""Configuração tipada, carregada do ambiente e do .env local."""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


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


@lru_cache
def get_settings() -> Settings:
    """Compartilha settings validados; testes podem limpar o cache."""
    return Settings()
