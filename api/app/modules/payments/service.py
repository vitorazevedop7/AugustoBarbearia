"""Conclusão do atendimento, falta e correção do pagamento (RN-31, RN-33, RN-40, RN-41).

Só a administração chama. Cada operação trava a linha do agendamento, confere o
status e o início, grava e faz `commit` numa transação só.
"""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.clock import TIMEZONE
from app.errors import DomainError
from app.modules.appointments.models import Appointment, AppointmentStatus
from app.modules.payments.models import Payment, PaymentMethod

_NOT_ACTIVE_MESSAGES = {
    AppointmentStatus.CANCELED: (
        "Este agendamento foi cancelado, então não pode ser concluído "
        "nem marcado como falta."
    ),
    AppointmentStatus.COMPLETED: "Este atendimento já foi concluído.",
    AppointmentStatus.NO_SHOW: "Este agendamento já foi marcado como falta.",
}


def check_amount(amount: Decimal) -> None:
    """RN-40: o valor cobrado é maior ou igual a zero. Zero é cortesia."""
    if amount < 0:
        raise DomainError(
            code="INVALID_PAYMENT_AMOUNT",
            message="O valor cobrado não pode ser negativo.",
            status_code=422,
        )


def _locked_appointment(session: Session, appointment_id: int) -> Appointment:
    """Trava a linha até o fim da transação e relê o status: dois pedidos do
    mesmo agendamento (concluir e marcar falta, por exemplo) passam um depois
    do outro, e o segundo encontra o status já mudado."""
    appointment = session.scalars(
        select(Appointment)
        .where(Appointment.id == appointment_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    ).one_or_none()
    if appointment is None:
        raise DomainError(
            code="APPOINTMENT_NOT_FOUND",
            message="Agendamento não encontrado.",
            status_code=404,
        )
    return appointment


def _ensure_closable(appointment: Appointment, now: datetime) -> None:
    """RN-31: só o agendamento ativo é concluído ou marcado como falta, e só
    quando o horário de início já chegou (inclusive no instante exato)."""
    if appointment.status != AppointmentStatus.SCHEDULED:
        raise DomainError(
            code="APPOINTMENT_NOT_ACTIVE",
            message=_NOT_ACTIVE_MESSAGES[appointment.status],
            status_code=409,
        )
    if appointment.starts_at > now:
        start = appointment.starts_at.astimezone(TIMEZONE)
        raise DomainError(
            code="APPOINTMENT_NOT_STARTED",
            message=(
                f"O horário de início ainda não chegou ({start:%d/%m} às "
                f"{start:%H:%M}). Só dá para concluir ou marcar falta a partir dele."
            ),
            status_code=409,
        )


def complete_appointment(
    session: Session,
    appointment_id: int,
    *,
    method: PaymentMethod,
    amount: Decimal | None,
    admin_email: str,
    now: datetime,
) -> Appointment:
    """RN-31 e RN-40: `SCHEDULED` → `COMPLETED` com o pagamento.

    Sem `amount`, vale o preço congelado do agendamento (RN-13). Registra
    quando e quem concluiu (RN-33). A vaga já fica livre (RN-32).
    """
    appointment = _locked_appointment(session, appointment_id)
    _ensure_closable(appointment, now)
    charged = appointment.price if amount is None else amount
    check_amount(charged)
    appointment.status = AppointmentStatus.COMPLETED
    appointment.closed_at = now
    appointment.closed_by = admin_email
    session.add(Payment(appointment_id=appointment.id, amount=charged, method=method))
    session.commit()
    return appointment


def mark_no_show(
    session: Session, appointment_id: int, *, admin_email: str, now: datetime
) -> Appointment:
    """RN-31: `SCHEDULED` → `NO_SHOW`, com a mesma condição da conclusão.
    Registra quando e quem marcou a falta (RN-33)."""
    appointment = _locked_appointment(session, appointment_id)
    _ensure_closable(appointment, now)
    appointment.status = AppointmentStatus.NO_SHOW
    appointment.closed_at = now
    appointment.closed_by = admin_email
    session.commit()
    return appointment


def correct_payment(
    session: Session,
    appointment_id: int,
    *,
    method: PaymentMethod | None,
    amount: Decimal | None,
) -> Appointment:
    """RN-41: corrige o valor e/ou a forma de pagamento de um atendimento
    concluído. O status e o registro de quem concluiu não mudam."""
    if method is None and amount is None:
        raise DomainError(
            code="EMPTY_PAYMENT_UPDATE",
            message="Informe o valor ou a forma de pagamento para corrigir.",
            status_code=422,
        )
    appointment = _locked_appointment(session, appointment_id)
    payment = session.scalars(
        select(Payment).where(Payment.appointment_id == appointment.id)
    ).one_or_none()
    if appointment.status != AppointmentStatus.COMPLETED or payment is None:
        raise DomainError(
            code="APPOINTMENT_NOT_COMPLETED",
            message="Só dá para corrigir o pagamento de um atendimento concluído.",
            status_code=409,
        )
    if amount is not None:
        check_amount(amount)
        payment.amount = amount
    if method is not None:
        payment.method = method
    session.commit()
    return appointment
