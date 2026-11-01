"""E-mails das ações da administração: agendar, remarcar e cancelar (RN-50, RN-52
a RN-54, S5.09)."""

from collections.abc import Iterator
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from pytest import MonkeyPatch
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.jobs import send_reminders
from app.modules.admin_booking import service as admin_service
from app.modules.appointments.models import (
    Appointment,
    AppointmentStatus,
    CanceledBy,
)
from app.modules.customers.models import Customer
from app.modules.notifications.models import (
    Notification,
    NotificationKind,
    NotificationStatus,
)
from app.modules.notifications.reminders import ReminderReport
from app.modules.notifications.sender import get_email_sender
from app.modules.notifications.service import build_email
from tests.factories import barber_id, local, make_appointment, service_by_name
from tests.test_admin_booking import (
    NEW_CUSTOMER,
    NOW,
    TWO_PM,
    UNAVAILABLE,
    Clock,
    admin_app,
    cancel,
    create,
    reschedule,
)
from tests.test_booking import TEN
from tests.test_notifications import (
    FakeSender,
    notifications_of,
    sender,  # noqa: F401  # pyright: ignore[reportUnusedImport]
    shop_with_contacts,  # noqa: F401  # pyright: ignore[reportUnusedImport]
)


@pytest.fixture
def clock() -> Clock:
    return Clock()


@pytest.fixture
def api(db_session: Session, clock: Clock, sender: FakeSender) -> Iterator[TestClient]:  # noqa: F811
    """A administração, com o relógio do teste e o remetente falso."""
    app = admin_app(lambda: db_session, lambda: clock.now)
    app.dependency_overrides[get_email_sender] = lambda: sender
    with TestClient(app) as client:
        yield client


@pytest.fixture
def edvaldo(db_session: Session) -> int:
    return barber_id(db_session, "Edvaldo")


@pytest.fixture
def lauro(db_session: Session) -> int:
    return barber_id(db_session, "Lauro")


@pytest.fixture
def corte_e_barba(db_session: Session) -> int:
    return service_by_name(db_session, "Corte + Barba").id


@pytest.fixture
def bia(db_session: Session) -> Customer:
    """Cliente de balcão com e-mail."""
    customer = Customer(name="Bia", phone="75988887777", email="bia@example.com")
    db_session.add(customer)
    db_session.flush()
    return customer


@pytest.fixture
def sem_email(db_session: Session) -> Customer:
    """Cliente de balcão só com telefone (RN-62)."""
    customer = Customer(name="Zé do Balcão", phone="75977776666")
    db_session.add(customer)
    db_session.flush()
    return customer


def booked_for(
    db_session: Session, customer: Customer, barber: int, starts_at: datetime
) -> Appointment:
    return make_appointment(
        db_session, barber=barber, starts_at=starts_at, customer=customer
    )


def all_notifications(session: Session) -> list[Notification]:
    session.expire_all()
    return list(session.scalars(select(Notification).order_by(Notification.id)))


# Confirmação (RN-50).


def test_rn50_administracao_agenda_e_o_cliente_recebe_a_confirmacao(
    api: TestClient,
    db_session: Session,
    sender: FakeSender,  # noqa: F811
    bia: Customer,
    edvaldo: int,
    corte_e_barba: int,
) -> None:
    response = create(api, edvaldo, corte_e_barba, TEN, customer_id=bia.id)

    assert response.status_code == 201, response.json()
    [notification] = notifications_of(db_session, response.json()["id"])
    assert notification.kind == NotificationKind.CONFIRMATION
    assert notification.recipient == "bia@example.com"
    assert notification.status == NotificationStatus.SENT
    [email] = sender.sent
    assert email.to == "bia@example.com"
    assert email.subject == "Agendamento confirmado: terça-feira, 3/11, às 10h00"
    assert "Olá, Bia!" in email.text
    assert "Serviço: Corte + Barba" in email.text
    assert "Barbeiro: Edvaldo" in email.text


def test_rn50_cliente_novo_com_email_recebe_a_confirmacao(
    api: TestClient,
    db_session: Session,
    sender: FakeSender,  # noqa: F811
    edvaldo: int,
    corte_e_barba: int,
) -> None:
    response = create(
        api,
        edvaldo,
        corte_e_barba,
        TEN,
        customer={**NEW_CUSTOMER, "email": "joao@example.com"},
    )

    assert response.status_code == 201, response.json()
    [notification] = notifications_of(db_session, response.json()["id"])
    assert notification.recipient == "joao@example.com"
    assert [email.to for email in sender.sent] == ["joao@example.com"]


def test_rn50_cliente_novo_sem_email_nao_ganha_registro_nem_envio(
    api: TestClient,
    db_session: Session,
    sender: FakeSender,  # noqa: F811
    edvaldo: int,
    corte_e_barba: int,
) -> None:
    response = create(api, edvaldo, corte_e_barba, TEN, customer=NEW_CUSTOMER)

    assert response.status_code == 201, response.json()
    assert response.json()["customer"]["email"] is None
    assert all_notifications(db_session) == []
    assert sender.sent == []


def test_rn50_cliente_cadastrado_sem_email_nao_recebe_nada_em_nenhuma_acao(
    api: TestClient,
    db_session: Session,
    sender: FakeSender,  # noqa: F811
    sem_email: Customer,
    edvaldo: int,
    lauro: int,
    corte_e_barba: int,
) -> None:
    created = create(api, edvaldo, corte_e_barba, TEN, customer_id=sem_email.id)
    assert created.status_code == 201, created.json()
    appointment_id = created.json()["id"]

    moved = reschedule(api, appointment_id, local(2026, 11, 4, 11), barber_id=lauro)
    assert moved.status_code == 200, moved.json()
    canceled = cancel(api, appointment_id)
    assert canceled.status_code == 200, canceled.json()

    assert canceled.json()["status"] == "CANCELED"
    assert all_notifications(db_session) == []
    assert sender.sent == []


def test_rn08_rn50_horario_recusado_nao_registra_nem_envia(
    api: TestClient,
    db_session: Session,
    sender: FakeSender,  # noqa: F811
    edvaldo: int,
    corte_e_barba: int,
    monkeypatch: MonkeyPatch,
) -> None:
    """A conferência passa, mas o banco recusa no commit (RN-08): o cliente
    novo, o agendamento e o registro do e-mail saem juntos."""
    make_appointment(db_session, barber=edvaldo, starts_at=TEN)
    monkeypatch.setattr(admin_service, "ensure_slot_available", lambda *_a, **_k: None)

    response = create(
        api,
        edvaldo,
        corte_e_barba,
        TEN,
        customer={**NEW_CUSTOMER, "email": "joao@example.com"},
    )

    assert response.status_code == 409
    assert response.json() == UNAVAILABLE
    assert all_notifications(db_session) == []
    assert sender.sent == []


# Remarcação (RN-52).


def test_rn52_administracao_remarca_e_o_cliente_recebe_o_novo_horario(
    api: TestClient,
    db_session: Session,
    sender: FakeSender,  # noqa: F811
    bia: Customer,
    edvaldo: int,
    lauro: int,
) -> None:
    appointment = booked_for(db_session, bia, edvaldo, TWO_PM)

    response = reschedule(api, appointment.id, local(2026, 11, 4, 16), barber_id=lauro)

    assert response.status_code == 200, response.json()
    [notification] = notifications_of(db_session, appointment.id)
    assert notification.kind == NotificationKind.RESCHEDULED
    assert notification.status == NotificationStatus.SENT
    [email] = sender.sent
    assert email.to == "bia@example.com"
    assert email.subject == "Agendamento remarcado: quarta-feira, 4/11, às 16h00"
    assert "Barbeiro: Lauro" in email.text
    assert "quarta-feira, 4 de novembro de 2026, às 16h00" in email.text


def test_rn15_mesmo_horario_recusado_nao_registra_email(
    api: TestClient,
    db_session: Session,
    sender: FakeSender,  # noqa: F811
    bia: Customer,
    edvaldo: int,
) -> None:
    appointment = booked_for(db_session, bia, edvaldo, TWO_PM)

    response = reschedule(api, appointment.id, TWO_PM)

    assert response.status_code == 409
    assert all_notifications(db_session) == []
    assert sender.sent == []


def test_rn08_rn52_remarcacao_recusada_no_commit_nao_registra_nem_envia(
    api: TestClient,
    db_session: Session,
    sender: FakeSender,  # noqa: F811
    bia: Customer,
    edvaldo: int,
    monkeypatch: MonkeyPatch,
) -> None:
    """O `notify` lê o cliente, e essa leitura descarrega (autoflush) o update
    que o banco recusa. Ele precisa estar dentro do `try` do `_commit` para a
    recusa virar 409; por isso o cliente sai da sessão, e a leitura vai ao banco
    (com ele na sessão, o `session.get` não faria SELECT nem autoflush)."""
    appointment = booked_for(db_session, bia, edvaldo, TWO_PM)
    make_appointment(db_session, barber=edvaldo, starts_at=local(2026, 11, 2, 16))
    monkeypatch.setattr(admin_service, "ensure_slot_available", lambda *_a, **_k: None)
    db_session.expunge(bia)

    response = reschedule(api, appointment.id, local(2026, 11, 2, 16))

    assert response.status_code == 409
    assert response.json() == UNAVAILABLE
    assert all_notifications(db_session) == []
    assert sender.sent == []


# Cancelamento (RN-52, RN-53).


def test_rn52_rn53_cancelamento_diz_que_foi_a_barbearia_e_traz_o_contato(
    api: TestClient,
    db_session: Session,
    sender: FakeSender,  # noqa: F811
    bia: Customer,
    edvaldo: int,
    shop_with_contacts: None,  # noqa: F811
) -> None:
    appointment = booked_for(db_session, bia, edvaldo, TWO_PM)

    response = cancel(api, appointment.id)

    assert response.status_code == 200, response.json()
    assert response.json()["canceled_by"] == "ADMIN"
    [notification] = notifications_of(db_session, appointment.id)
    assert notification.kind == NotificationKind.CANCELED
    assert notification.status == NotificationStatus.SENT
    [email] = sender.sent
    assert email.to == "bia@example.com"
    assert email.subject == "Agendamento cancelado: segunda-feira, 2/11, às 14h00"
    for content in (email.text, email.html):
        assert "A Augusto Barbearia cancelou o seu agendamento." in content
        # RN-53: o contato da barbearia, para combinar outro horário.
        assert "(75) 99999-0000" in content
        assert "contato@augusto.example" in content
        assert "Rua das Flores, 10 - Centro" in content
        assert "/meus-agendamentos" in content
    assert "foi cancelado" not in email.text


def test_rn52_cancelamento_pelo_cliente_continua_com_o_texto_de_antes(
    db_session: Session, bia: Customer, edvaldo: int
) -> None:
    appointment = booked_for(db_session, bia, edvaldo, TWO_PM)
    appointment.status = AppointmentStatus.CANCELED
    appointment.canceled_at = NOW
    appointment.canceled_by = CanceledBy.CUSTOMER
    notification = Notification(
        appointment=appointment,
        kind=NotificationKind.CANCELED,
        recipient="bia@example.com",
        status=NotificationStatus.PENDING,
    )
    db_session.add(notification)
    db_session.flush()

    email = build_email(db_session, notification)

    assert "foi cancelado" in email.text
    assert "cancelou o seu agendamento" not in email.text


# Falha de envio (RN-54).


def test_rn54_falha_no_envio_nao_desfaz_o_agendamento_da_administracao(
    api: TestClient,
    db_session: Session,
    sender: FakeSender,  # noqa: F811
    bia: Customer,
    edvaldo: int,
    corte_e_barba: int,
) -> None:
    sender.error = RuntimeError("Resend fora do ar")

    response = create(api, edvaldo, corte_e_barba, TEN, customer_id=bia.id)

    assert response.status_code == 201, response.json()
    appointment = db_session.get(Appointment, response.json()["id"])
    assert appointment is not None
    assert appointment.status == AppointmentStatus.SCHEDULED
    [notification] = notifications_of(db_session, appointment.id)
    assert notification.status == NotificationStatus.FAILED
    assert notification.error == "RuntimeError: Resend fora do ar"


def test_rn54_falha_no_envio_nao_desfaz_a_remarcacao_da_administracao(
    api: TestClient,
    db_session: Session,
    sender: FakeSender,  # noqa: F811
    bia: Customer,
    edvaldo: int,
) -> None:
    appointment = booked_for(db_session, bia, edvaldo, TWO_PM)
    sender.error = RuntimeError("Resend fora do ar")
    new_start = local(2026, 11, 4, 16)

    response = reschedule(api, appointment.id, new_start)

    assert response.status_code == 200, response.json()
    db_session.expire_all()
    assert appointment.starts_at == new_start
    [notification] = notifications_of(db_session, appointment.id)
    assert notification.kind == NotificationKind.RESCHEDULED
    assert notification.status == NotificationStatus.FAILED


def test_rn54_falha_no_envio_nao_desfaz_o_cancelamento_da_administracao(
    api: TestClient,
    db_session: Session,
    sender: FakeSender,  # noqa: F811
    bia: Customer,
    edvaldo: int,
) -> None:
    appointment = booked_for(db_session, bia, edvaldo, TWO_PM)
    sender.error = RuntimeError("Resend fora do ar")

    response = cancel(api, appointment.id)

    assert response.status_code == 200, response.json()
    db_session.expire_all()
    assert appointment.status == AppointmentStatus.CANCELED
    assert appointment.canceled_by == CanceledBy.ADMIN
    [notification] = notifications_of(db_session, appointment.id)
    assert (notification.kind, notification.status) == (
        NotificationKind.CANCELED,
        NotificationStatus.FAILED,
    )


def test_rn52_agendamento_que_nao_esta_ativo_nao_gera_email(
    api: TestClient,
    db_session: Session,
    sender: FakeSender,  # noqa: F811
    bia: Customer,
    edvaldo: int,
) -> None:
    appointment = make_appointment(
        db_session,
        barber=edvaldo,
        starts_at=TWO_PM,
        customer=bia,
        status=AppointmentStatus.CANCELED,
    )

    assert cancel(api, appointment.id).status_code == 409
    assert reschedule(api, appointment.id, local(2026, 11, 4, 16)).status_code == 409
    assert all_notifications(db_session) == []
    assert sender.sent == []


# Lembrete depois da remarcação pela administração (RN-51, RN-52).

REMINDER_NOW = local(2026, 11, 2, 10)


def mark_times(
    session: Session,
    appointment: Appointment,
    *,
    created: datetime,
    rescheduled: datetime | None = None,
) -> None:
    """Põe os `created_at` que o relógio do banco real não dá: o do agendamento
    e o do último `RESCHEDULED`."""
    appointment.created_at = created
    if rescheduled is not None:
        last = notifications_of(session, appointment.id)[-1]
        assert last.kind == NotificationKind.RESCHEDULED
        last.created_at = rescheduled
    session.flush()


def run_reminders(
    session: Session,
    sender: FakeSender,  # noqa: F811
    now: datetime,
) -> ReminderReport:
    return send_reminders.run(session, sender, lambda: now)


def test_rn51_rn52_remarcacao_da_administracao_move_o_lembrete_para_o_novo_horario(
    api: TestClient,
    db_session: Session,
    sender: FakeSender,  # noqa: F811
    bia: Customer,
    edvaldo: int,
    corte_e_barba: int,
) -> None:
    created = create(api, edvaldo, corte_e_barba, TEN, customer_id=bia.id)
    appointment = db_session.get(Appointment, created.json()["id"])
    assert appointment is not None
    mark_times(db_session, appointment, created=NOW - timedelta(days=7))
    # O lembrete do horário antigo (terça, 10h) sai na segunda, 10h.
    assert run_reminders(db_session, sender, REMINDER_NOW) == ReminderReport(sent=1)

    new_start = local(2026, 11, 5, 10)
    moved = reschedule(api, appointment.id, new_start)
    assert moved.status_code == 200, moved.json()
    mark_times(
        db_session,
        appointment,
        created=NOW - timedelta(days=7),
        rescheduled=REMINDER_NOW + timedelta(hours=1),
    )

    # O lembrete já enviado não impede o do horário novo, que sai na janela dele.
    assert run_reminders(db_session, sender, local(2026, 11, 3, 12)) == ReminderReport()
    assert run_reminders(db_session, sender, new_start - timedelta(hours=24)) == (
        ReminderReport(sent=1)
    )
    kinds = [item.kind for item in notifications_of(db_session, appointment.id)]
    assert kinds == [
        NotificationKind.CONFIRMATION,
        NotificationKind.REMINDER,
        NotificationKind.RESCHEDULED,
        NotificationKind.REMINDER,
    ]
    assert sender.sent[-1].subject == (
        "Lembrete: seu horário é quinta-feira, 5/11, às 10h00"
    )


def test_rn51_rn52_remarcado_pela_administracao_com_menos_de_24h_nao_tem_lembrete(
    api: TestClient,
    db_session: Session,
    sender: FakeSender,  # noqa: F811
    bia: Customer,
    edvaldo: int,
    corte_e_barba: int,
) -> None:
    created = create(api, edvaldo, corte_e_barba, TEN, customer_id=bia.id)
    appointment = db_session.get(Appointment, created.json()["id"])
    assert appointment is not None
    new_start = local(2026, 11, 5, 10)

    moved = reschedule(api, appointment.id, new_start)

    assert moved.status_code == 200, moved.json()
    # Remarcado 10h antes do novo horário: o e-mail da remarcação já cumpre o
    # papel do lembrete.
    mark_times(
        db_session,
        appointment,
        created=NOW - timedelta(days=7),
        rescheduled=new_start - timedelta(hours=10),
    )
    for hours in (25, 24, 23):
        report = run_reminders(db_session, sender, new_start - timedelta(hours=hours))
        assert report == ReminderReport()
    assert [item.kind for item in notifications_of(db_session, appointment.id)] == [
        NotificationKind.CONFIRMATION,
        NotificationKind.RESCHEDULED,
    ]
    assert len(sender.sent) == 2


def test_rn51_cancelado_pela_administracao_nao_recebe_lembrete(
    api: TestClient,
    db_session: Session,
    sender: FakeSender,  # noqa: F811
    bia: Customer,
    edvaldo: int,
    corte_e_barba: int,
) -> None:
    created = create(api, edvaldo, corte_e_barba, TEN, customer_id=bia.id)
    appointment = db_session.get(Appointment, created.json()["id"])
    assert appointment is not None
    mark_times(db_session, appointment, created=NOW - timedelta(days=7))

    assert cancel(api, appointment.id).status_code == 200

    assert run_reminders(db_session, sender, REMINDER_NOW) == ReminderReport()
    assert [email.subject.split(":")[0] for email in sender.sent] == [
        "Agendamento confirmado",
        "Agendamento cancelado",
    ]
