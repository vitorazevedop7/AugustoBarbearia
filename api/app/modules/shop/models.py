"""Tabelas da barbearia (registro único) e do horário de funcionamento."""

from datetime import time

from sqlalchemy import CheckConstraint, SmallInteger, String, Text, Time
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base

SHOP_ID = 1


class Shop(Base):
    __tablename__ = "shop"
    __table_args__ = (CheckConstraint("id = 1", name="ck_shop_single_row"),)

    id: Mapped[int] = mapped_column(
        SmallInteger, primary_key=True, autoincrement=False, default=SHOP_ID
    )
    name: Mapped[str] = mapped_column(String(80))
    tagline: Mapped[str | None] = mapped_column(String(160))
    about: Mapped[str | None] = mapped_column(Text)
    address: Mapped[str | None] = mapped_column(String(200))
    # Só dígitos: DDD + número.
    phone: Mapped[str | None] = mapped_column(String(11))
    whatsapp: Mapped[str | None] = mapped_column(String(11))
    # Sem o "@".
    instagram: Mapped[str | None] = mapped_column(String(30))
    email: Mapped[str | None] = mapped_column(String(254))


class BusinessHours(Base):
    """RN-02: um dia da semana; abertura e fechamento vazios = fechado.

    As horas são locais de São Paulo (RN-01), por isso `time` sem fuso.
    """

    __tablename__ = "business_hours"
    __table_args__ = (
        CheckConstraint("weekday BETWEEN 0 AND 6", name="ck_business_hours_weekday"),
        CheckConstraint(
            "(opens_at IS NULL AND closes_at IS NULL)"
            " OR (opens_at IS NOT NULL AND closes_at IS NOT NULL"
            " AND opens_at < closes_at)",
            name="ck_business_hours_interval",
        ),
    )

    # 0 = segunda … 6 = domingo, como `date.weekday()`.
    weekday: Mapped[int] = mapped_column(
        SmallInteger, primary_key=True, autoincrement=False
    )
    opens_at: Mapped[time | None] = mapped_column(Time)
    closes_at: Mapped[time | None] = mapped_column(Time)
