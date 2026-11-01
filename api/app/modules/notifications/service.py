"""E-mails ao cliente: registro na transação da ação e envio depois do commit
(RN-50 a RN-54, ADR 0006).

A API interna, que o lembrete (S5.08) e as ações da administração (S5.09, em
`admin_booking`) reaproveitam:

1. `notify` registra o e-mail `PENDING` na transação da ação, sem commit;
2. depois do commit, o service entrega o registro à `Outbox`;
3. `send_notification` envia e marca `SENT` ou `FAILED`, sem desfazer a ação.
"""

import logging
from typing import Protocol

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.clock import utc_now
from app.config import get_settings
from app.modules.appointments.models import Appointment, CanceledBy
from app.modules.barbers.service import get_barber
from app.modules.catalog.service import get_service
from app.modules.customers.models import Customer
from app.modules.notifications.models import (
    Notification,
    NotificationKind,
    NotificationStatus,
)
from app.modules.notifications.sender import Email, EmailSender
from app.modules.notifications.templates import (
    AppointmentDetails,
    ShopContact,
    render,
)
from app.modules.shop.service import get_shop

logger = logging.getLogger(__name__)

# O erro guardado é para diagnóstico; o resto fica no log.
ERROR_MAX_LENGTH = 1000


class Outbox(Protocol):
    """Quem envia os registros depois do commit. Nas rotas, é a `RequestOutbox`
    (`dependencies.py`)."""

    def send_after_commit(self, notification: Notification | None) -> None:
        """Chamado só depois do commit da ação. Aceita `None` (cliente sem
        e-mail), para o service não precisar conferir."""
        ...


def notify(
    session: Session, appointment: Appointment, kind: NotificationKind
) -> Notification | None:
    """Registra o e-mail `kind` do agendamento na transação em curso, sem commit.

    RN-50: o cliente sem e-mail não recebe nada, e então não há registro. O
    agendamento pode ainda não estar gravado: a relação põe o insert depois do
    dele, e um rollback da ação desfaz os dois.
    """
    customer = session.get(Customer, appointment.customer_id)
    if customer is None or not customer.email:
        return None
    notification = Notification(
        appointment=appointment,
        kind=kind,
        recipient=customer.email,
        status=NotificationStatus.PENDING,
    )
    session.add(notification)
    return notification


def build_email(session: Session, notification: Notification) -> Email:
    """Monta o e-mail com o estado atual do agendamento (RN-52, RN-53)."""
    appointment = notification.appointment
    customer = session.get(Customer, appointment.customer_id)
    if customer is None:
        raise LookupError(f"Cliente {appointment.customer_id} não existe.")
    shop = get_shop(session)
    web_base_url = get_settings().web_base_url.rstrip("/")
    rendered = render(
        notification.kind,
        AppointmentDetails(
            customer_name=customer.name,
            service_name=get_service(session, appointment.service_id).name,
            barber_name=get_barber(session, appointment.barber_id).name,
            starts_at=appointment.starts_at,
            shop=ShopContact(
                name=shop.name,
                address=shop.address,
                phone=shop.phone,
                whatsapp=shop.whatsapp,
                instagram=shop.instagram,
                email=shop.email,
            ),
            my_appointments_url=f"{web_base_url}/meus-agendamentos",
            canceled_by_shop=appointment.canceled_by == CanceledBy.ADMIN,
        ),
    )
    return Email(
        to=notification.recipient,
        subject=rendered.subject,
        html=rendered.html,
        text=rendered.text,
        idempotency_key=f"notification-{notification.id}",
    )


def _describe(error: Exception) -> str:
    return f"{type(error).__name__}: {error}"[:ERROR_MAX_LENGTH]


def send_notification(
    session: Session, notification_id: int, sender: EmailSender
) -> Notification:
    """Envia um registro `PENDING` e grava o resultado, com commit.

    Idempotente: trava o registro e só envia se ele ainda estiver `PENDING`;
    `SENT` e `FAILED` não são enviados de novo. RN-54: qualquer falha ao montar
    ou enviar vira `FAILED` com o erro, e a ação que gerou o e-mail continua
    valendo.
    """
    notification = session.scalars(
        select(Notification)
        .where(Notification.id == notification_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    ).one()
    if notification.status != NotificationStatus.PENDING:
        session.commit()
        return notification
    try:
        sender.send(build_email(session, notification))
    except Exception as error:
        logger.warning(
            "Falha ao enviar a notificação %s (%s).",
            notification.id,
            notification.kind,
            exc_info=error,
        )
        notification.status = NotificationStatus.FAILED
        notification.error = _describe(error)
    else:
        notification.status = NotificationStatus.SENT
        notification.sent_at = utc_now()
    session.commit()
    return notification
