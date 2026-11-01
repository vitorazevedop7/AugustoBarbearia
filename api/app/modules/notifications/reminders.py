"""Lembrete por e-mail 24 horas antes do horário (RN-51, ADR 0006).

O job `app.jobs.send_reminders` chama `send_due_reminders` de hora em hora. A
função reaproveita a API interna do módulo (`notify` e `send_notification`), então
o lembrete tem o mesmo conteúdo dos outros e-mails (RN-53) e a falha de envio
fica registrada sem derrubar o job (RN-54).
"""

import logging
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy import Select, exists, func, select
from sqlalchemy.orm import Session, aliased

from app.modules.appointments.models import Appointment, AppointmentStatus
from app.modules.customers.models import Customer
from app.modules.notifications.models import (
    Notification,
    NotificationKind,
    NotificationStatus,
)
from app.modules.notifications.sender import EmailSender
from app.modules.notifications.service import notify, send_notification

logger = logging.getLogger(__name__)

# RN-51: "cerca de 24 horas antes". O job roda de hora em hora e olha uma janela
# de 2 horas em torno das 24: cada agendamento passa por duas execuções, e a
# segunda cobre uma falha da primeira (ADR 0006).
WINDOW_START = timedelta(hours=23)
WINDOW_END = timedelta(hours=25)
# RN-51: com menos de 24h entre o agendamento e o início, não há lembrete.
MIN_NOTICE = timedelta(hours=24)


@dataclass(frozen=True, slots=True)
class ReminderReport:
    """O que uma execução do job fez, para o log."""

    sent: int = 0
    failed: int = 0


def latest_reschedule(
    session: Session, appointment: Appointment
) -> Notification | None:
    """O `RESCHEDULED` mais recente do agendamento, se houver.

    Toda remarcação, por qualquer lado, gera esse e-mail com o registro na mesma
    transação (RN-52), e o registro marca o momento e a ordem dos fatos. Assim o
    lembrete não depende de um campo que cada ação precisaria lembrar de
    atualizar.
    """
    return session.scalars(
        select(Notification)
        .where(
            Notification.appointment_id == appointment.id,
            Notification.kind == NotificationKind.RESCHEDULED,
        )
        .order_by(Notification.id.desc())
        .limit(1)
    ).one_or_none()


def booked_at(appointment: Appointment, rescheduled: Notification | None) -> datetime:
    """Quando o horário atual foi marcado: a criação do agendamento ou, se ele
    foi remarcado, a remarcação mais recente."""
    if rescheduled is None:
        return appointment.created_at
    return max(appointment.created_at, rescheduled.created_at)


def has_reminder(
    session: Session, appointment: Appointment, rescheduled: Notification | None
) -> bool:
    """Já há lembrete registrado para o horário atual? Conta qualquer status:
    um `FAILED` não é tentado de novo (ver a spec). Um lembrete registrado antes
    da última remarcação foi do horário antigo e não conta.

    A ordem vem do `id`, não da data: as ações que mudam o horário e o job
    travam a mesma linha do agendamento, então a sequência dos registros é a
    ordem real dos fatos, sem depender do relógio.
    """
    after = rescheduled.id if rescheduled is not None else 0
    found = session.scalar(
        select(
            exists().where(
                Notification.appointment_id == appointment.id,
                Notification.kind == NotificationKind.REMINDER,
                Notification.id > after,
            )
        )
    )
    return bool(found)


def _due_appointment_ids(session: Session, now: datetime) -> Sequence[int]:
    """Agendamentos ativos na janela cujo cliente tem e-mail (RN-50)."""
    return session.scalars(
        select(Appointment.id)
        .join(Customer, Customer.id == Appointment.customer_id)
        .where(
            Appointment.status == AppointmentStatus.SCHEDULED,
            Appointment.starts_at >= now + WINDOW_START,
            Appointment.starts_at < now + WINDOW_END,
            Customer.email.is_not(None),
            Customer.email != "",
        )
        .order_by(Appointment.starts_at, Appointment.id)
    ).all()


def _register_reminder(
    session: Session, appointment_id: int, now: datetime
) -> Notification | None:
    """Registra o lembrete de um agendamento, com commit, se ele ainda for devido.

    Trava a linha do agendamento e confere de novo, já com a trava: duas
    execuções ao mesmo tempo não registram dois lembretes, e uma remarcação do
    cliente (que também trava a linha) espera ou é esperada. Quem encontra a
    linha travada pula o agendamento: a outra execução cuida dele.
    """
    appointment = session.scalars(
        select(Appointment)
        .where(
            Appointment.id == appointment_id,
            Appointment.status == AppointmentStatus.SCHEDULED,
            Appointment.starts_at >= now + WINDOW_START,
            Appointment.starts_at < now + WINDOW_END,
        )
        .with_for_update(skip_locked=True)
        .execution_options(populate_existing=True)
    ).one_or_none()
    if appointment is None:
        session.commit()  # só solta a transação; nada foi alterado
        return None
    rescheduled = latest_reschedule(session, appointment)
    since = booked_at(appointment, rescheduled)
    # RN-51: marcado com menos de 24h de antecedência (ou remarcado assim), a
    # confirmação já cumpre o papel do lembrete.
    if appointment.starts_at - since < MIN_NOTICE or has_reminder(
        session, appointment, rescheduled
    ):
        session.commit()
        return None
    notification = notify(session, appointment, NotificationKind.REMINDER)
    session.commit()
    return notification


def _current_pending_reminders(now: datetime) -> Select[tuple[int]]:
    """Lembretes `PENDING` que ainda valem: do horário atual (registrados depois
    da última remarcação), de agendamento ativo e dentro da janela de 23h a 25h.
    Um lembrete de horário antigo ou fora da janela não sai."""
    rescheduled = aliased(Notification)
    last_reschedule = (
        select(func.coalesce(func.max(rescheduled.id), 0))
        .where(
            rescheduled.appointment_id == Appointment.id,
            rescheduled.kind == NotificationKind.RESCHEDULED,
        )
        .scalar_subquery()
    )
    return (
        select(Notification.id)
        .join(Appointment, Appointment.id == Notification.appointment_id)
        .where(
            Notification.kind == NotificationKind.REMINDER,
            Notification.status == NotificationStatus.PENDING,
            Notification.id > last_reschedule,
            Appointment.status == AppointmentStatus.SCHEDULED,
            Appointment.starts_at >= now + WINDOW_START,
            Appointment.starts_at < now + WINDOW_END,
        )
    )


def _unsent_reminder_ids(session: Session, now: datetime) -> Sequence[int]:
    """Lembretes registrados que não saíram (o processo caiu entre o commit e o
    envio) e que ainda valem."""
    return session.scalars(
        _current_pending_reminders(now).order_by(Notification.id)
    ).all()


def _send_if_still_due(
    session: Session, notification_id: int, sender: EmailSender, now: datetime
) -> Notification | None:
    """Envia o lembrete `PENDING` com o agendamento travado, depois de conferir
    de novo que ele ainda vale.

    O registro e o envio são commits separados; entre os dois o cliente pode
    cancelar ou remarcar, ou outra execução pode enviar o mesmo lembrete. A
    trava na linha do agendamento (a mesma que o cancelamento, a remarcação e o
    registro do lembrete usam) vale até o commit do envio: ou a alteração já foi
    confirmada e a conferência a vê, ou ela espera o envio. A espera é curta
    (outro registro ou um envio, com tempo limite no Resend). Devolve `None`
    quando não enviou.
    """
    appointment_id = session.scalar(
        select(Notification.appointment_id).where(Notification.id == notification_id)
    )
    if appointment_id is None:
        return None
    session.scalars(
        select(Appointment.id).where(Appointment.id == appointment_id).with_for_update()
    ).one()
    still_due = session.scalar(
        _current_pending_reminders(now).where(Notification.id == notification_id)
    )
    if still_due is None:
        session.commit()  # solta a trava
        return None
    return send_notification(session, notification_id, sender, now)


def _count(report: ReminderReport, notification: Notification | None) -> ReminderReport:
    """Conta o que esta execução enviou. Com o agendamento travado só ela envia
    o registro, então o status final é o resultado dela."""
    if notification is None:
        return report
    if notification.status == NotificationStatus.SENT:
        return ReminderReport(report.sent + 1, report.failed)
    if notification.status == NotificationStatus.FAILED:
        return ReminderReport(report.sent, report.failed + 1)
    return report


def send_due_reminders(
    session: Session, sender: EmailSender, now: datetime
) -> ReminderReport:
    """Envia o lembrete dos agendamentos `SCHEDULED` que começam entre 23h e 25h
    à frente de `now` e ainda não têm lembrete (RN-51).

    Idempotente: rodar de novo, ou duas vezes ao mesmo tempo, não envia um
    segundo e-mail. Um lembrete `PENDING` de uma execução que caiu é enviado
    agora, se ainda estiver na janela e for do horário atual. Uma falha de envio
    fica no registro (`FAILED`, RN-54) e o job segue com os outros.
    """
    report = ReminderReport()
    unsent = list(_unsent_reminder_ids(session, now))
    due = list(_due_appointment_ids(session, now))
    session.commit()  # solta a transação da leitura antes de travar e enviar
    for notification_id in unsent:
        sent = _send_if_still_due(session, notification_id, sender, now)
        report = _count(report, sent)
    for appointment_id in due:
        registered = _register_reminder(session, appointment_id, now)
        if registered is not None:
            sent = _send_if_still_due(session, registered.id, sender, now)
            report = _count(report, sent)
    logger.info("Lembretes: %s enviados, %s com falha.", report.sent, report.failed)
    return report
