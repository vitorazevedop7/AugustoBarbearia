"""A `Outbox` das rotas: o envio dos e-mails como background task (ADR 0006)."""

from datetime import datetime
from typing import Annotated

from fastapi import BackgroundTasks, Depends
from sqlalchemy.orm import Session

from app.clock import utc_now
from app.db import get_session
from app.modules.notifications.models import Notification
from app.modules.notifications.sender import EmailSender, get_email_sender
from app.modules.notifications.service import send_notification


class RequestOutbox:
    """Agenda o envio para depois da resposta, com a sessão da requisição.

    A background task roda antes de a dependência `get_session` fechar a sessão
    (as dependências com `yield` da requisição saem depois da resposta e das
    tarefas). Ela só roda quando a rota termina sem erro.
    """

    def __init__(
        self,
        session: Annotated[Session, Depends(get_session)],
        background_tasks: BackgroundTasks,
        sender: Annotated[EmailSender, Depends(get_email_sender)],
        now: Annotated[datetime, Depends(utc_now)],
    ) -> None:
        self._session = session
        self._tasks = background_tasks
        self._sender = sender
        self._now = now

    def send_after_commit(self, notification: Notification | None) -> None:
        if notification is None:
            return
        self._tasks.add_task(
            send_notification,
            self._session,
            notification.id,
            self._sender,
            self._now,
        )


OutboxDep = Annotated[RequestOutbox, Depends()]
