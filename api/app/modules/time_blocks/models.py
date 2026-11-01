"""Tabela de bloqueios (RN-03)."""

from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    String,
    func,
    literal_column,
)
from sqlalchemy.dialects.postgresql import TSTZRANGE, ExcludeConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base

REASON_MAX_LENGTH = 120

# Nome da exclusion constraint que impede dois bloqueios cruzados do mesmo
# barbeiro. O serviço confere antes; a constraint é a última barreira.
OVERLAP_CONSTRAINT = "ex_time_blocks_barber_overlap"


class TimeBlock(Base):
    """RN-03: intervalo `[starts_at, ends_at)` em que o barbeiro não atende.

    A folga de dia inteiro vai da meia-noite à meia-noite seguinte, no fuso de
    São Paulo (RN-01).
    """

    __tablename__ = "time_blocks"
    __table_args__ = (
        CheckConstraint("ends_at > starts_at", name="ck_time_blocks_range"),
        ExcludeConstraint(
            ("barber_id", "="),
            (literal_column("tstzrange(starts_at, ends_at, '[)')", TSTZRANGE()), "&&"),
            name=OVERLAP_CONSTRAINT,
            using="gist",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    barber_id: Mapped[int] = mapped_column(ForeignKey("barbers.id"))
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    reason: Mapped[str | None] = mapped_column(String(REASON_MAX_LENGTH))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
