"""Regras dos agendamentos usadas por outros módulos (RN-08, RN-60).

Criar, cancelar, remarcar e concluir entram nas próximas issues (S3.08 em diante).
"""

from datetime import datetime

import psycopg
from sqlalchemy import exists, select
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

from app.modules.appointments.models import (
    OVERLAP_CONSTRAINT,
    Appointment,
    AppointmentStatus,
)

# SQLSTATEs do Postgres para a reserva que perde a disputa por um horário.
EXCLUSION_VIOLATION = "23P01"
DEADLOCK_DETECTED = "40P01"


def barber_has_future_appointments(
    session: Session, barber_id: int, now: datetime
) -> bool:
    """RN-60: o barbeiro tem agendamento ativo que ainda não terminou.

    Conta também o que está em andamento (`ends_at > now`). Um agendamento que
    já terminou e continua `SCHEDULED` só espera a conclusão ou a falta.
    """
    return bool(
        session.scalar(
            select(
                exists().where(
                    Appointment.barber_id == barber_id,
                    Appointment.status == AppointmentStatus.SCHEDULED,
                    Appointment.ends_at > now,
                )
            )
        )
    )


def is_slot_conflict(error: DBAPIError) -> bool:
    """RN-08: a gravação perdeu a disputa pelo horário para outra transação.

    Normalmente o banco recusa com a violação da exclusion constraint. Quando
    duas transações gravam no mesmo instante, cada uma espera a outra e o
    Postgres desfaz uma delas com deadlock. Nos dois casos, a resposta ao
    usuário é "horário não está mais disponível".
    """
    original = error.orig
    if not isinstance(original, psycopg.Error):
        return False
    if original.sqlstate == DEADLOCK_DETECTED:
        return True
    return (
        original.sqlstate == EXCLUSION_VIOLATION
        and original.diag.constraint_name == OVERLAP_CONSTRAINT
    )
