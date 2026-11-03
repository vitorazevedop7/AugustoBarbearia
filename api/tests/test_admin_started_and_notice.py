# ruff: noqa: F811
"""Horário que já começou e aviso do prazo de 2 horas nos e-mails (RN-14, RN-50,
RN-52, RN-53, S5.09)."""

from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.customers.models import Customer
from app.modules.notifications.models import (
    Notification,
    NotificationKind,
    NotificationStatus,
)
from app.modules.notifications.reminders import ReminderReport
from app.modules.notifications.service import build_email
from tests.factories import local
from tests.test_admin_booking import NOW, cancel, create, reschedule
from tests.test_admin_notifications import (  # noqa: F401  # pyright: ignore[reportUnusedImport]
    all_notifications,
    api,
    bia,
    booked_for,
    clock,
    corte_e_barba,
    edvaldo,
    lauro,
    mark_times,
    run_reminders,
)
from tests.test_notifications import (
    FakeSender,
    sender,  # noqa: F401  # pyright: ignore[reportUnusedImport]
    shop_with_contacts,  # noqa: F401  # pyright: ignore[reportUnusedImport]
)

# Horário que já começou (decisão do proprietário, RN-50 e RN-52).
# O "agora" da administração nos testes é 13h50; a grade é de 30 minutos.
STARTED = local(2026, 11, 2, 13, 30)
IN_90_MIN = local(2026, 11, 2, 15, 30)


def test_rn50_encaixe_ja_comecado_nao_registra_nem_envia_confirmacao(
    api: TestClient,
    db_session: Session,
    sender: FakeSender,  # noqa: F811
    bia: Customer,
    edvaldo: int,
    corte_e_barba: int,
) -> None:
    response = create(api, edvaldo, corte_e_barba, STARTED, customer_id=bia.id)

    assert response.status_code == 201, response.json()
    assert response.json()["notified"] is False
    assert all_notifications(db_session) == []
    assert sender.sent == []


def test_rn50_agendamento_futuro_com_email_confirma(
    api: TestClient,
    sender: FakeSender,  # noqa: F811
    bia: Customer,
    edvaldo: int,
    corte_e_barba: int,
) -> None:
    response = create(api, edvaldo, corte_e_barba, IN_90_MIN, customer_id=bia.id)

    assert response.status_code == 201, response.json()
    assert response.json()["notified"] is True
    [email] = sender.sent
    assert email.subject == "Agendamento confirmado: segunda-feira, 2/11, às 15h30"


def test_rn52_cancelar_horario_que_ja_comecou_nao_envia_email(
    api: TestClient,
    db_session: Session,
    sender: FakeSender,  # noqa: F811
    bia: Customer,
    edvaldo: int,
) -> None:
    appointment = booked_for(db_session, bia, edvaldo, STARTED)

    response = cancel(api, appointment.id)

    assert response.status_code == 200, response.json()
    assert response.json()["status"] == "CANCELED"
    assert response.json()["notified"] is False
    assert all_notifications(db_session) == []
    assert sender.sent == []


def test_rn52_remarcar_para_horario_que_ja_comecou_nao_envia_email(
    api: TestClient,
    db_session: Session,
    sender: FakeSender,  # noqa: F811
    bia: Customer,
    edvaldo: int,
) -> None:
    appointment = booked_for(db_session, bia, edvaldo, local(2026, 11, 2, 16))

    response = reschedule(api, appointment.id, STARTED)

    assert response.status_code == 200, response.json()
    assert response.json()["notified"] is False
    assert all_notifications(db_session) == []
    assert sender.sent == []
    # RN-51: o horário que começou nunca entra na janela do lembrete, de agora
    # em diante; o job não faz nada.
    mark_times(db_session, appointment, created=NOW - timedelta(days=7))
    for later in (timedelta(), timedelta(hours=1), timedelta(days=1)):
        report = run_reminders(db_session, sender, NOW + later)
        assert report == ReminderReport()
    assert sender.sent == []


def test_rn52_remarcar_de_horario_que_ja_comecou_para_um_futuro_envia(
    api: TestClient,
    db_session: Session,
    sender: FakeSender,  # noqa: F811
    bia: Customer,
    edvaldo: int,
) -> None:
    appointment = booked_for(db_session, bia, edvaldo, STARTED)

    response = reschedule(api, appointment.id, local(2026, 11, 4, 16))

    assert response.status_code == 200, response.json()
    assert response.json()["notified"] is True
    [email] = sender.sent
    assert email.subject == "Agendamento remarcado: quarta-feira, 4/11, às 16h00"


# O aviso do prazo de 2 horas (RN-14, RN-53).

STARTED_NOTICE = "Seu horário já começou."
VALID = (
    "Você pode remarcar ou cancelar pelo site até o horário marcado. "
    "Se puder, avise com pelo menos 2 horas de antecedência."
)
LATE = (
    "Imprevisto? Você ainda pode remarcar ou cancelar pelo site até o horário "
    "marcado. Quanto antes avisar, melhor."
)


def email_for(
    session: Session,
    customer: Customer,
    barber: int,
    kind: NotificationKind,
    *,
    starts_at: datetime,
    now: datetime,
) -> tuple[str, str]:
    appointment = booked_for(session, customer, barber, starts_at)
    notification = Notification(
        appointment=appointment,
        kind=kind,
        recipient=customer.email or "",
        status=NotificationStatus.PENDING,
    )
    session.add(notification)
    session.flush()
    email = build_email(session, notification, now)
    return email.text, email.html


@pytest.mark.parametrize(
    "kind", [NotificationKind.CONFIRMATION, NotificationKind.RESCHEDULED]
)
@pytest.mark.parametrize(
    ("ahead", "notice"),
    [
        (timedelta(hours=2, minutes=1), VALID),
        (timedelta(hours=2), VALID),
        (timedelta(hours=1, minutes=59), LATE),
        (timedelta(minutes=10), LATE),
        (timedelta(0), STARTED_NOTICE),
        (timedelta(minutes=-10), STARTED_NOTICE),
    ],
)
def test_rn14_rn53_aviso_do_prazo_acompanha_o_momento_do_envio(
    db_session: Session,
    bia: Customer,
    edvaldo: int,
    shop_with_contacts: None,  # noqa: F811
    kind: NotificationKind,
    ahead: timedelta,
    notice: str,
) -> None:
    """D16: no prazo, a política; nas últimas 2 horas, o convite a avisar;
    depois do início, falar com a barbearia."""
    starts_at = local(2026, 11, 4, 16)

    text, html = email_for(
        db_session, bia, edvaldo, kind, starts_at=starts_at, now=starts_at - ahead
    )

    for content in (text, html):
        for other in (VALID, LATE, STARTED_NOTICE):
            assert (other in content) is (other == notice)
        # RN-53: os contatos vêm em todo e-mail, valendo o prazo ou não.
        assert "(75) 99999-0000" in content
    if notice == STARTED_NOTICE:
        assert "fale com a barbearia pelos contatos abaixo" in text


def test_rn53_prazo_vencido_sem_contatos_nao_manda_olhar_abaixo(
    db_session: Session, bia: Customer, edvaldo: int
) -> None:
    starts_at = local(2026, 11, 4, 16)

    text, _html = email_for(
        db_session,
        bia,
        edvaldo,
        NotificationKind.CONFIRMATION,
        starts_at=starts_at,
        now=starts_at + timedelta(minutes=5),
    )

    assert f"{STARTED_NOTICE} Para qualquer mudança, fale com a barbearia." in text
    assert "contatos abaixo" not in text


def test_rn14_rn53_lembrete_tambem_so_cita_o_prazo_enquanto_vale(
    db_session: Session, bia: Customer, edvaldo: int
) -> None:
    starts_at = local(2026, 11, 4, 16)

    valid, _ = email_for(
        db_session,
        bia,
        edvaldo,
        NotificationKind.REMINDER,
        starts_at=starts_at,
        now=starts_at - timedelta(hours=24),
    )
    late, _ = email_for(
        db_session,
        bia,
        edvaldo,
        NotificationKind.REMINDER,
        starts_at=local(2026, 11, 5, 16),
        now=local(2026, 11, 5, 15),
    )

    assert (
        "Não vai conseguir vir? Remarque ou cancele pelo site. Se puder, avise "
        "com pelo menos 2 horas de antecedência."
    ) in valid
    assert LATE not in valid
    assert f"Não vai conseguir vir? {LATE}" in late


def test_rn14_rn53_cancelamento_nao_traz_o_aviso_do_prazo(
    db_session: Session, bia: Customer, edvaldo: int
) -> None:
    starts_at = local(2026, 11, 4, 16)

    text, _ = email_for(
        db_session,
        bia,
        edvaldo,
        NotificationKind.CANCELED,
        starts_at=starts_at,
        now=starts_at - timedelta(hours=5),
    )

    assert VALID not in text
    assert LATE not in text
    assert STARTED_NOTICE not in text


def test_rn53_email_enviado_pela_rota_usa_o_relogio_da_requisicao(
    api: TestClient,
    sender: FakeSender,  # noqa: F811
    bia: Customer,
    edvaldo: int,
    corte_e_barba: int,
) -> None:
    """Agendado 1h40 antes do início: o e-mail da administração já sai em
    cima da hora e convida a avisar, em vez da política do prazo normal."""
    response = create(api, edvaldo, corte_e_barba, IN_90_MIN, customer_id=bia.id)

    assert response.status_code == 201, response.json()
    [email] = sender.sent
    assert LATE in email.text
    assert VALID not in email.text
