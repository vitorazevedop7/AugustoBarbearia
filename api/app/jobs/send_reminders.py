"""Job do lembrete por e-mail: `python -m app.jobs.send_reminders` (RN-51).

Roda de hora em hora pelo serviço `jobs` (ADR 0006, S6/#32); à mão, no Compose:
`docker compose exec api uv run python -m app.jobs.send_reminders`.
"""

import logging
from collections.abc import Callable
from datetime import datetime

from sqlalchemy.orm import Session

from app.clock import utc_now
from app.db import get_engine
from app.modules.notifications.reminders import ReminderReport, send_due_reminders
from app.modules.notifications.sender import EmailSender, get_email_sender

logger = logging.getLogger(__name__)


def run(
    session: Session,
    sender: EmailSender,
    now: Callable[[], datetime] = utc_now,
) -> ReminderReport:
    """Uma execução do job. O relógio entra como argumento, como o `utc_now` das
    rotas, para os testes fixarem o momento."""
    return send_due_reminders(session, sender, now())


def main() -> None:
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s"
    )
    with Session(get_engine()) as session:
        run(session, get_email_sender())


if __name__ == "__main__":
    main()
