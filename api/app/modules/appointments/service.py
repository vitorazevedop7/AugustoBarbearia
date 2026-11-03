"""Regras dos agendamentos usadas por outros módulos (RN-08, RN-60).

Criar, cancelar, remarcar e concluir entram nas próximas issues (S3.08 em diante).
"""

from datetime import datetime, timedelta

import psycopg
from sqlalchemy import exists, select
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

from app.modules.appointments.models import (
    OVERLAP_CONSTRAINT,
    Appointment,
    AppointmentStatus,
    CanceledBy,
)

# SQLSTATEs do Postgres para a reserva que perde a disputa por um horário.
EXCLUSION_VIOLATION = "23P01"
DEADLOCK_DETECTED = "40P01"

# RN-14: a antecedência recomendada. O cliente cancela ou remarca até o
# início; nas últimas 2 horas, a alteração é "em cima da hora" (D16).
CHANGE_NOTICE = timedelta(hours=2)


def can_change_at(starts_at: datetime, now: datetime) -> bool:
    """RN-14: ainda dá para o cliente cancelar ou remarcar um horário que
    começa em `starts_at`: até o início, sem incluí-lo. Só o tempo; o status
    (RN-31) é conferido por quem chama. É a regra que o `booking` aplica e que
    os e-mails (RN-53) usam para escolher o texto.
    """
    return now < starts_at


def is_late_change(starts_at: datetime, now: datetime) -> bool:
    """RN-14: a alteração agora é em cima da hora, nas 2 horas antes do início
    e com ele ainda por vir. Exatamente 2 horas antes ainda está no prazo."""
    return starts_at - CHANGE_NOTICE < now < starts_at


def is_late_cancellation(appointment: Appointment) -> bool:
    """RN-14 e RN-33: o cliente cancelou nas 2 horas antes do início. O
    cancelamento da administração não conta: quem decide é ela."""
    return (
        appointment.status == AppointmentStatus.CANCELED
        and appointment.canceled_by == CanceledBy.CUSTOMER
        and appointment.canceled_at is not None
        and is_late_change(appointment.starts_at, appointment.canceled_at)
    )


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
