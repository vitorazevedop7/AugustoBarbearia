"""Tabela de barbeiros (RN-60). O barbeiro não tem login (D2)."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, func, true
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base

NAME_MAX_LENGTH = 80
PHOTO_PATH_MAX_LENGTH = 200
# RN-60: a apresentação tem até 400 caracteres.
BIO_MAX_LENGTH = 400


class Barber(Base):
    __tablename__ = "barbers"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(NAME_MAX_LENGTH))
    # Caminho de uma foto estática do web (`/images/barbeiros/...`); sem upload.
    photo_path: Mapped[str | None] = mapped_column(String(PHOTO_PATH_MAX_LENGTH))
    bio: Mapped[str | None] = mapped_column(String(BIO_MAX_LENGTH))
    active: Mapped[bool] = mapped_column(Boolean, server_default=true())
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
