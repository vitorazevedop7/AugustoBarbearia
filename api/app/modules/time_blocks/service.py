"""Regras dos bloqueios da agenda (RN-01, RN-03, RN-70).

O bloqueio entra na lista de ocupados do cálculo de disponibilidade (RN-05,
item 3) em `availability/service.py`; aqui ficam a criação, a leitura e a
remoção.
"""

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta

from sqlalchemy import Select, exists, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.clock import TIMEZONE
from app.errors import DomainError
from app.modules.agenda.service import check_period, period_bounds
from app.modules.appointments.models import Appointment, AppointmentStatus
from app.modules.barbers.models import Barber
from app.modules.barbers.service import get_barber
from app.modules.time_blocks.models import OVERLAP_CONSTRAINT, TimeBlock
from app.modules.time_blocks.schemas import TimeBlockCreate


@dataclass(frozen=True, slots=True)
class TimeBlockEntry:
    """O bloqueio com o barbeiro, para a resposta."""

    block: TimeBlock
    barber: Barber


def _invalid(message: str) -> DomainError:
    return DomainError(code="INVALID_TIME_BLOCK", message=message, status_code=422)


def block_range(
    day: date, start_time: time | None, end_time: time | None, *, all_day: bool
) -> tuple[datetime, datetime]:
    """RN-01, RN-03: o intervalo do bloqueio no fuso de São Paulo.

    A folga do dia inteiro é pedida de forma explícita (`all_day`) e vai da
    meia-noite do dia até a meia-noite seguinte, cobrindo o expediente
    qualquer que seja; os horários são ignorados. Sem ela, início e fim são
    obrigatórios, o bloqueio fica dentro do dia e o fim vem depois do início.
    Segundos são descartados.
    """
    if day >= date.max:
        raise _invalid("Escolha uma data válida.")
    if all_day:
        return period_bounds(day, day)
    if start_time is None or end_time is None:
        raise _invalid("Informe o início e o fim, ou marque o dia inteiro.")
    starts_at = _local(day, start_time)
    ends_at = _local(day, end_time)
    if ends_at <= starts_at:
        raise _invalid("O fim do bloqueio precisa ser depois do início.")
    return starts_at, ends_at


def _local(day: date, moment: time) -> datetime:
    clean = moment.replace(second=0, microsecond=0, tzinfo=None)
    return datetime.combine(day, clean, TIMEZONE)


def is_all_day(block: TimeBlock) -> bool:
    """A folga de dia inteiro: da meia-noite à meia-noite seguinte (RN-03)."""
    start = block.starts_at.astimezone(TIMEZONE)
    end = block.ends_at.astimezone(TIMEZONE)
    return (
        start.time() == time.min
        and end.time() == time.min
        and end.date() == start.date() + timedelta(days=1)
    )


def _has_active_appointment(
    session: Session, barber_id: int, starts_at: datetime, ends_at: datetime
) -> bool:
    """RN-03: algum agendamento ativo (RN-30) do barbeiro cruza o intervalo.

    Os intervalos são `[início, fim)`: encostar não cruza.
    """
    return bool(
        session.scalar(
            select(
                exists().where(
                    Appointment.barber_id == barber_id,
                    Appointment.status == AppointmentStatus.SCHEDULED,
                    Appointment.starts_at < ends_at,
                    Appointment.ends_at > starts_at,
                )
            )
        )
    )


def _overlaps_block(
    session: Session, barber_id: int, starts_at: datetime, ends_at: datetime
) -> bool:
    return bool(
        session.scalar(
            select(
                exists().where(
                    TimeBlock.barber_id == barber_id,
                    TimeBlock.starts_at < ends_at,
                    TimeBlock.ends_at > starts_at,
                )
            )
        )
    )


def _conflict() -> DomainError:
    return DomainError(
        code="TIME_BLOCK_CONFLICT",
        message=(
            "Este barbeiro tem agendamento marcado nesse intervalo. Cancele ou "
            "remarque o agendamento antes de bloquear."
        ),
        status_code=409,
    )


def _overlap() -> DomainError:
    return DomainError(
        code="TIME_BLOCK_OVERLAP",
        message=(
            "Este intervalo cruza outro bloqueio do barbeiro. Remova o bloqueio "
            "existente ou escolha outro horário."
        ),
        status_code=409,
    )


def _violated_constraint(error: IntegrityError) -> str | None:
    return getattr(getattr(error.orig, "diag", None), "constraint_name", None)


def create_time_block(session: Session, data: TimeBlockCreate) -> TimeBlockEntry:
    """RN-03: bloqueia um intervalo sem agendamentos ativos.

    Trava a linha do barbeiro com `FOR UPDATE` antes de procurar agendamentos.
    A criação e a remarcação de agendamento travam a mesma linha com
    `FOR SHARE` em `ensure_slot_available` antes de ler os ocupados. Uma espera
    a outra, e quem chega depois enxerga o que a primeira gravou: o bloqueio é
    recusado com o agendamento já confirmado, ou a reserva é recusada com o
    bloqueio já confirmado (RN-05, item 3; RN-08).
    """
    starts_at, ends_at = block_range(
        data.date, data.start_time, data.end_time, all_day=data.all_day
    )
    barber = get_barber(session, data.barber_id, lock="update")
    if _has_active_appointment(session, barber.id, starts_at, ends_at):
        raise _conflict()
    if _overlaps_block(session, barber.id, starts_at, ends_at):
        raise _overlap()
    block = TimeBlock(
        barber_id=barber.id,
        starts_at=starts_at,
        ends_at=ends_at,
        reason=data.reason,
    )
    session.add(block)
    try:
        session.commit()
    except IntegrityError as error:
        # Só acontece sem a trava acima; a constraint é a última barreira.
        session.rollback()
        if _violated_constraint(error) == OVERLAP_CONSTRAINT:
            raise _overlap() from error
        raise
    return TimeBlockEntry(block=block, barber=barber)


def _entries_query() -> Select[tuple[TimeBlock, Barber]]:
    return select(TimeBlock, Barber).join(Barber, Barber.id == TimeBlock.barber_id)


def list_time_blocks(
    session: Session, *, start: date, end: date, barber_id: int | None = None
) -> list[TimeBlockEntry]:
    """Os bloqueios que cruzam o período (até 7 dias, como a agenda), por
    início, nome do barbeiro e id. As datas são dias de São Paulo (RN-01)."""
    check_period(start, end)
    selected = get_barber(session, barber_id) if barber_id is not None else None
    since, until = period_bounds(start, end)
    query = _entries_query().where(
        TimeBlock.starts_at < until, TimeBlock.ends_at > since
    )
    if selected is not None:
        query = query.where(TimeBlock.barber_id == selected.id)
    rows = session.execute(
        query.order_by(TimeBlock.starts_at, Barber.name, TimeBlock.id)
    ).all()
    return [TimeBlockEntry(block=block, barber=barber) for block, barber in rows]


def _not_found() -> DomainError:
    return DomainError(
        code="TIME_BLOCK_NOT_FOUND",
        message="Bloqueio não encontrado.",
        status_code=404,
    )


def get_time_block(session: Session, block_id: int) -> TimeBlockEntry:
    row = session.execute(_entries_query().where(TimeBlock.id == block_id)).first()
    if row is None:
        raise _not_found()
    block, barber = row
    return TimeBlockEntry(block=block, barber=barber)


def delete_time_block(session: Session, block_id: int) -> None:
    """Remove o bloqueio; os horários voltam a ser oferecidos na hora (RN-05)."""
    block = session.get(TimeBlock, block_id)
    if block is None:
        raise _not_found()
    session.delete(block)
    session.commit()
