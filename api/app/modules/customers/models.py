"""Tabela de clientes (RN-62), com ou sem conta Google (RN-20, RN-23)."""

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base

NAME_MAX_LENGTH = 120
EMAIL_MAX_LENGTH = 320
# DDD + número, só dígitos: 10 (fixo) ou 11 (celular).
PHONE_MAX_LENGTH = 11


class Customer(Base):
    __tablename__ = "customers"
    __table_args__ = (
        UniqueConstraint("email", name="uq_customers_email"),
        UniqueConstraint("auth_user_id", name="uq_customers_auth_user_id"),
        # RN-62: o cadastro que veio do Google sempre tem e-mail.
        CheckConstraint(
            "auth_user_id IS NULL OR email IS NOT NULL",
            name="ck_customers_google_email",
        ),
        # RN-62/RN-20: sem conta, o telefone é obrigatório desde o cadastro; com
        # conta, o cliente informa o telefone depois, no perfil (RN-10).
        CheckConstraint(
            "auth_user_id IS NOT NULL OR phone IS NOT NULL",
            name="ck_customers_phone",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(NAME_MAX_LENGTH))
    phone: Mapped[str | None] = mapped_column(String(PHONE_MAX_LENGTH))
    # Normalizado em minúsculas pelo service, para o vínculo da RN-23.
    email: Mapped[str | None] = mapped_column(String(EMAIL_MAX_LENGTH))
    # `sub` do JWT: o id do usuário do Better Auth. Sem FK, porque a tabela
    # `user` pertence ao Better Auth (ADR 0002).
    auth_user_id: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
