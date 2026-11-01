"""Remetentes de e-mail: Resend em produção e log sem chave (ADR 0006)."""

import logging
from dataclasses import dataclass
from typing import Protocol

import resend

from app.config import get_settings

logger = logging.getLogger(__name__)

# Segundos por envio: um Resend lento não segura a requisição por muito tempo.
RESEND_TIMEOUT = 10


@dataclass(frozen=True, slots=True)
class Email:
    to: str
    subject: str
    html: str
    text: str
    # Repetir o envio com a mesma chave não gera um segundo e-mail.
    idempotency_key: str


class EmailSender(Protocol):
    def send(self, email: Email) -> None:
        """Entrega o e-mail ao provedor; levanta exceção se ele recusar."""
        ...


class ResendSender:
    """Envia pelo SDK do Resend. A chave e o cliente HTTP são globais do SDK."""

    def __init__(self, api_key: str, sender: str) -> None:
        resend.api_key = api_key
        resend.default_http_client = resend.RequestsClient(timeout=RESEND_TIMEOUT)
        self._sender = sender

    def send(self, email: Email) -> None:
        resend.Emails.send(
            {
                "from": self._sender,
                "to": [email.to],
                "subject": email.subject,
                "html": email.html,
                "text": email.text,
            },
            {"idempotency_key": email.idempotency_key},
        )


class LogSender:
    """Sem `RESEND_API_KEY` (desenvolvimento e testes): o e-mail vai para o log.

    Em `WARNING`, que aparece sem configurar o logging (o `uvicorn` só configura
    os próprios loggers) e denuncia uma produção sem a chave.
    """

    def send(self, email: Email) -> None:
        logger.warning(
            "E-mail não enviado (sem RESEND_API_KEY).\nPara: %s\nAssunto: %s\n\n%s",
            email.to,
            email.subject,
            email.text,
        )


def get_email_sender() -> EmailSender:
    """O remetente da configuração. É dependência das rotas; os testes a
    substituem."""
    settings = get_settings()
    api_key = settings.resend_api_key.strip()
    if not api_key:
        return LogSender()
    return ResendSender(api_key, settings.email_from.strip())
