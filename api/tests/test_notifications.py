"""E-mails ao cliente: confirmação, remarcação e cancelamento (RN-50 a RN-54)."""

import logging
from collections.abc import Iterator
from datetime import UTC, datetime
from typing import Any

import pytest
import resend
from fastapi.testclient import TestClient
from pydantic import ValidationError
from pytest import LogCaptureFixture, MonkeyPatch
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.modules.appointments.models import Appointment, AppointmentStatus
from app.modules.booking import service as booking_service
from app.modules.customers.models import Customer
from app.modules.notifications.models import (
    Notification,
    NotificationKind,
    NotificationStatus,
)
from app.modules.notifications.sender import (
    Email,
    LogSender,
    ResendSender,
    get_email_sender,
)
from app.modules.notifications.service import notify, send_notification
from app.modules.notifications.templates import (
    AppointmentDetails,
    ShopContact,
    render,
)
from app.modules.shop.service import get_shop
from tests.factories import (
    barber_id,
    local,
    make_appointment,
    make_customer,
    service_by_name,
)
from tests.test_booking import NOW, SUB, TEN, UNAVAILABLE, book, customer_app

WEDNESDAY_TEN = local(2026, 11, 4, 10)


class FakeSender:
    """Guarda os e-mails em vez de enviar; com `error`, simula o Resend fora."""

    def __init__(self) -> None:
        self.sent: list[Email] = []
        self.error: Exception | None = None

    def send(self, email: Email) -> None:
        if self.error is not None:
            raise self.error
        self.sent.append(email)


@pytest.fixture
def sender() -> FakeSender:
    return FakeSender()


@pytest.fixture
def api(db_session: Session, sender: FakeSender) -> Iterator[TestClient]:
    app = customer_app(lambda: db_session, now=lambda: NOW.astimezone(UTC))
    app.dependency_overrides[get_email_sender] = lambda: sender
    with TestClient(app) as client:
        yield client


@pytest.fixture
def ana(api: TestClient, db_session: Session) -> Customer:
    """O cliente do `api` (ana@example.com), com telefone."""
    response = api.patch("/me/profile", json={"phone": "(11) 98765-4321"})
    assert response.status_code == 200, response.json()
    found = db_session.scalar(select(Customer).where(Customer.auth_user_id == SUB))
    assert found is not None
    return found


@pytest.fixture
def edvaldo(db_session: Session) -> int:
    return barber_id(db_session, "Edvaldo")


@pytest.fixture
def corte_e_barba(db_session: Session) -> int:
    return service_by_name(db_session, "Corte + Barba").id


@pytest.fixture
def shop_with_contacts(db_session: Session) -> None:
    shop = get_shop(db_session)
    shop.name = "Augusto Barbearia"
    shop.address = "Rua das Flores, 10 - Centro"
    shop.phone = "7532221234"
    shop.whatsapp = "75999990000"
    shop.instagram = "augustobarbearia"
    shop.email = "contato@augusto.example"
    db_session.flush()


def notifications_of(session: Session, appointment_id: int) -> list[Notification]:
    return list(
        session.scalars(
            select(Notification)
            .where(Notification.appointment_id == appointment_id)
            .order_by(Notification.id)
            .execution_options(populate_existing=True)
        ).all()
    )


def booked_id(api: TestClient, edvaldo: int, corte_e_barba: int) -> int:
    response = book(api, edvaldo, corte_e_barba, TEN)
    assert response.status_code == 201, response.json()
    return response.json()["id"]


def test_rn50_agendar_envia_confirmacao_ao_cliente(
    api: TestClient,
    db_session: Session,
    sender: FakeSender,
    ana: Customer,
    edvaldo: int,
    corte_e_barba: int,
) -> None:
    appointment_id = booked_id(api, edvaldo, corte_e_barba)

    [notification] = notifications_of(db_session, appointment_id)
    assert notification.kind == NotificationKind.CONFIRMATION
    assert notification.recipient == "ana@example.com"
    assert notification.status == NotificationStatus.SENT
    assert notification.sent_at is not None
    assert notification.error is None
    [email] = sender.sent
    assert email.to == "ana@example.com"
    assert email.subject == "Agendamento confirmado: terça-feira, 3/11, às 10h00"
    assert email.idempotency_key == f"notification-{notification.id}"


def test_rn53_email_traz_servico_barbeiro_data_endereco_link_e_contato(
    api: TestClient,
    sender: FakeSender,
    ana: Customer,
    edvaldo: int,
    corte_e_barba: int,
    shop_with_contacts: None,
    monkeypatch: MonkeyPatch,
) -> None:
    monkeypatch.setenv("WEB_BASE_URL", "https://augusto.example/")
    get_settings.cache_clear()

    booked_id(api, edvaldo, corte_e_barba)

    [email] = sender.sent
    expected = [
        "Corte + Barba",
        "Edvaldo",
        "terça-feira, 3 de novembro de 2026, às 10h00",
        "Rua das Flores, 10 - Centro",
        "https://augusto.example/meus-agendamentos",
        "(75) 99999-0000",
        "(75) 3222-1234",
        "@augustobarbearia",
        "contato@augusto.example",
    ]
    for content in (email.text, email.html):
        for value in expected:
            assert value in content
    assert "Olá, Ana!" in email.text
    assert "até 2 horas antes" in email.text
    assert 'href="https://wa.me/5575999990000"' in email.html


def test_rn53_campos_vazios_da_barbearia_nao_aparecem(
    api: TestClient,
    sender: FakeSender,
    ana: Customer,
    edvaldo: int,
    corte_e_barba: int,
) -> None:
    booked_id(api, edvaldo, corte_e_barba)

    [email] = sender.sent
    assert "Onde:" not in email.text
    assert "Fale com a barbearia" not in email.text
    assert "http://localhost:3000/meus-agendamentos" in email.text


def test_rn52_remarcar_envia_email_com_o_novo_horario_e_barbeiro(
    api: TestClient,
    db_session: Session,
    sender: FakeSender,
    ana: Customer,
    edvaldo: int,
    corte_e_barba: int,
) -> None:
    appointment_id = booked_id(api, edvaldo, corte_e_barba)
    lauro = barber_id(db_session, "Lauro")

    response = api.post(
        f"/me/appointments/{appointment_id}/reschedule",
        json={"starts_at": WEDNESDAY_TEN.isoformat(), "barber_id": lauro},
    )

    assert response.status_code == 200, response.json()
    kinds = [item.kind for item in notifications_of(db_session, appointment_id)]
    assert kinds == [NotificationKind.CONFIRMATION, NotificationKind.RESCHEDULED]
    email = sender.sent[-1]
    assert email.subject == "Agendamento remarcado: quarta-feira, 4/11, às 10h00"
    assert "Barbeiro: Lauro" in email.text
    assert "quarta-feira, 4 de novembro de 2026, às 10h00" in email.text


def test_rn52_cancelar_envia_email_de_cancelamento(
    api: TestClient,
    db_session: Session,
    sender: FakeSender,
    ana: Customer,
    edvaldo: int,
    corte_e_barba: int,
) -> None:
    appointment_id = booked_id(api, edvaldo, corte_e_barba)

    response = api.post(f"/me/appointments/{appointment_id}/cancel")

    assert response.status_code == 200, response.json()
    notifications = notifications_of(db_session, appointment_id)
    assert [item.kind for item in notifications] == [
        NotificationKind.CONFIRMATION,
        NotificationKind.CANCELED,
    ]
    assert all(item.status == NotificationStatus.SENT for item in notifications)
    email = sender.sent[-1]
    assert email.subject == "Agendamento cancelado: terça-feira, 3/11, às 10h00"
    assert "foi cancelado" in email.text


def test_rn54_falha_no_envio_nao_desfaz_o_agendamento(
    api: TestClient,
    db_session: Session,
    sender: FakeSender,
    ana: Customer,
    edvaldo: int,
    corte_e_barba: int,
) -> None:
    sender.error = RuntimeError("Resend fora do ar")

    appointment_id = booked_id(api, edvaldo, corte_e_barba)

    appointment = db_session.get(Appointment, appointment_id)
    assert appointment is not None
    assert appointment.status == AppointmentStatus.SCHEDULED
    [notification] = notifications_of(db_session, appointment_id)
    assert notification.status == NotificationStatus.FAILED
    assert notification.error == "RuntimeError: Resend fora do ar"
    assert notification.sent_at is None


def test_rn54_falha_no_envio_nao_desfaz_o_cancelamento(
    api: TestClient,
    db_session: Session,
    sender: FakeSender,
    ana: Customer,
    edvaldo: int,
    corte_e_barba: int,
) -> None:
    appointment_id = booked_id(api, edvaldo, corte_e_barba)
    sender.error = RuntimeError("Resend fora do ar")

    response = api.post(f"/me/appointments/{appointment_id}/cancel")

    assert response.status_code == 200, response.json()
    assert response.json()["status"] == "CANCELED"
    last = notifications_of(db_session, appointment_id)[-1]
    assert (last.kind, last.status) == (
        NotificationKind.CANCELED,
        NotificationStatus.FAILED,
    )


def test_rn08_horario_tomado_no_commit_nao_registra_nem_envia(
    api: TestClient,
    db_session: Session,
    sender: FakeSender,
    ana: Customer,
    edvaldo: int,
    corte_e_barba: int,
    monkeypatch: MonkeyPatch,
) -> None:
    """A conferência passa, mas o banco recusa no commit (RN-08): o registro
    sai junto com o agendamento, e nenhum e-mail é enviado."""
    make_appointment(db_session, barber=edvaldo, starts_at=TEN)
    monkeypatch.setattr(
        booking_service, "ensure_slot_available", lambda *_a, **_k: None
    )

    response = book(api, edvaldo, corte_e_barba, TEN)

    assert response.status_code == 409
    assert response.json() == UNAVAILABLE
    assert db_session.scalars(select(Notification)).all() == []
    assert sender.sent == []


def test_rn50_cliente_sem_email_nao_tem_registro(db_session: Session) -> None:
    customer = make_customer(db_session)
    assert customer.email is None
    appointment = make_appointment(
        db_session,
        barber=barber_id(db_session, "Edvaldo"),
        starts_at=TEN,
        customer=customer,
    )

    assert notify(db_session, appointment, NotificationKind.CONFIRMATION) is None
    assert db_session.scalars(select(Notification)).all() == []


def test_envio_e_idempotente(db_session: Session, sender: FakeSender) -> None:
    customer = Customer(name="Bia", phone="75988887777", email="bia@example.com")
    db_session.add(customer)
    db_session.flush()
    appointment = make_appointment(
        db_session,
        barber=barber_id(db_session, "Edvaldo"),
        starts_at=TEN,
        customer=customer,
    )
    notification = notify(db_session, appointment, NotificationKind.CONFIRMATION)
    assert notification is not None
    db_session.commit()

    send_notification(db_session, notification.id, sender)
    again = send_notification(db_session, notification.id, sender)

    assert again.status == NotificationStatus.SENT
    assert len(sender.sent) == 1


def test_sem_chave_o_email_vai_para_o_log(
    db_session: Session, caplog: LogCaptureFixture
) -> None:
    """Sem `RESEND_API_KEY` (o `conftest` garante), o remetente é o de log e o
    registro fica `SENT`."""
    assert isinstance(get_email_sender(), LogSender)
    app = customer_app(lambda: db_session, now=lambda: NOW.astimezone(UTC))
    with TestClient(app) as client:
        assert client.patch("/me/profile", json={"phone": "11987654321"}).is_success
        with caplog.at_level(logging.INFO, "app.modules.notifications.sender"):
            response = book(
                client,
                barber_id(db_session, "Edvaldo"),
                service_by_name(db_session, "Corte + Barba").id,
            )

    assert response.status_code == 201, response.json()
    assert "Para: ana@example.com" in caplog.text
    assert "Agendamento confirmado: terça-feira, 3/11, às 10h00" in caplog.text
    [notification] = notifications_of(db_session, response.json()["id"])
    assert notification.status == NotificationStatus.SENT


def test_com_chave_o_remetente_e_o_resend(monkeypatch: MonkeyPatch) -> None:
    calls: list[tuple[Any, Any]] = []
    monkeypatch.setattr(resend, "api_key", None)
    monkeypatch.setattr(resend, "default_http_client", resend.default_http_client)
    monkeypatch.setattr(
        resend.Emails,
        "send",
        lambda params, options=None: calls.append((params, options)),
    )
    monkeypatch.setenv("RESEND_API_KEY", "re_chave_de_teste")
    monkeypatch.setenv("EMAIL_FROM", "Augusto Barbearia <agenda@augusto.example>")
    get_settings.cache_clear()

    sender = get_email_sender()
    assert isinstance(sender, ResendSender)
    sender.send(
        Email(
            to="ana@example.com",
            subject="Assunto",
            html="<p>Oi</p>",
            text="Oi",
            idempotency_key="notification-7",
        )
    )

    assert resend.api_key == "re_chave_de_teste"
    assert calls == [
        (
            {
                "from": "Augusto Barbearia <agenda@augusto.example>",
                "to": ["ana@example.com"],
                "subject": "Assunto",
                "html": "<p>Oi</p>",
                "text": "Oi",
            },
            {"idempotency_key": "notification-7"},
        )
    ]


def test_chave_do_resend_exige_remetente(monkeypatch: MonkeyPatch) -> None:
    monkeypatch.setenv("RESEND_API_KEY", "re_chave_de_teste")
    monkeypatch.setenv("EMAIL_FROM", " ")

    with pytest.raises(ValidationError, match="EMAIL_FROM"):
        Settings()


def details(**changes: Any) -> AppointmentDetails:
    values: dict[str, Any] = {
        "customer_name": "Ana",
        "service_name": "Corte Simples",
        "barber_name": "Edvaldo",
        # 23h30 em UTC já é o dia 3 às 20h30 em São Paulo (RN-01).
        "starts_at": datetime(2026, 11, 3, 23, 30, tzinfo=UTC),
        "shop": ShopContact(
            name="Augusto Barbearia",
            address=None,
            phone=None,
            whatsapp=None,
            instagram=None,
            email=None,
        ),
        "my_appointments_url": "http://localhost:3000/meus-agendamentos",
    }
    return AppointmentDetails(**{**values, **changes})


def test_rn01_data_e_hora_no_fuso_de_sao_paulo() -> None:
    email = render(NotificationKind.CONFIRMATION, details())

    assert email.subject == "Agendamento confirmado: terça-feira, 3/11, às 20h30"
    assert "terça-feira, 3 de novembro de 2026, às 20h30" in email.text


def test_rn53_html_escapa_os_dados() -> None:
    email = render(
        NotificationKind.CONFIRMATION, details(customer_name="<b>Ana</b> & Cia")
    )

    assert "&lt;b&gt;Ana&lt;/b&gt; &amp; Cia" in email.html
    assert "<b>Ana</b>" not in email.html
    assert "Olá, <b>Ana</b> & Cia!" in email.text


def test_rn51_template_do_lembrete() -> None:
    email = render(NotificationKind.REMINDER, details())

    assert email.subject == "Lembrete: seu horário é terça-feira, 3/11, às 20h30"
    assert "Passando para lembrar" in email.text
    assert "http://localhost:3000/meus-agendamentos" in email.html
