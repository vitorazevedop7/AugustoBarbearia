"""Tabelas de serviços e da associação Barbeiro–Serviço (RN-61)."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    func,
    true,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.modules.barbers.models import Barber

NAME_MAX_LENGTH = 80
DESCRIPTION_MAX_LENGTH = 400
# RN-61: a duração é múltiplo de 5 minutos, com no mínimo 10 minutos.
DURATION_STEP_MINUTES = 5
MIN_DURATION_MINUTES = 10


class BarberService(Base):
    """Associação N:N: o barbeiro realiza o serviço (RN-61)."""

    __tablename__ = "barber_services"

    barber_id: Mapped[int] = mapped_column(ForeignKey("barbers.id"), primary_key=True)
    service_id: Mapped[int] = mapped_column(ForeignKey("services.id"), primary_key=True)


class Service(Base):
    __tablename__ = "services"
    __table_args__ = (
        CheckConstraint("price >= 0", name="ck_services_price_non_negative"),
        CheckConstraint(
            f"duration_minutes >= {MIN_DURATION_MINUTES}"
            f" AND duration_minutes % {DURATION_STEP_MINUTES} = 0",
            name="ck_services_duration",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(NAME_MAX_LENGTH))
    description: Mapped[str | None] = mapped_column(String(DESCRIPTION_MAX_LENGTH))
    # Dinheiro sempre em Decimal / numeric(10,2), nunca em float.
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    duration_minutes: Mapped[int] = mapped_column(Integer)
    active: Mapped[bool] = mapped_column(Boolean, server_default=true())
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Quem realiza o serviço (RN-61), por nome. Nas listas, carregue com
    # `selectinload(Service.barbers)` para evitar uma consulta por serviço.
    barbers: Mapped[list[Barber]] = relationship(
        secondary=BarberService.__table__,
        order_by=(Barber.name, Barber.id),
    )
