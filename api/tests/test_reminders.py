"""Lembrete por e-mail 24 horas antes (RN-51, RN-53, RN-54, S5.08)."""

import threading
from collections.abc import Iterator
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import pytest
from pytest import LogCaptureFixture, MonkeyPatch
from sqlalchemy import Engine, delete, func, select, text
from sqlalchemy.orm import Session

from app.jobs import send_reminders
from app.modules.appointments.models import (
    Appointment,
    AppointmentSource,
    AppointmentStatus,
)
from app.modules.customers.models import Customer
from app.modules.notifications import reminders
from app.modules.notifications.models import (
    Notification,
    NotificationKind,
    NotificationStatus,
)
from app.modules.notifications.reminders import ReminderReport, send_due_reminders
from app.modules.notifications.sender import Email
from tests.factories import barber_id, local, make_appointment, service_by_name

# O "agora" do job nos testes: segunda-feira, 10h00 em São Paulo.
NOW = local(2026, 11, 2, 10)
# O horário que está a 24h do "agora".
TOMORROW = NOW + timedelta(hours=24)
LONG_AGO = NOW - timedelta(days=7)


class FakeSender:
    """Guarda os e-mails em vez de enviar; `fail_for` simula o Resend recusando
    um destinatário."""

    def __init__(self) -> None:
        self.sent: list[Email] = []
        self.fail_for: set[str] = set()
        self.delay: threading.Event | None = None

    def send(self, email: Email) -> None:
        if email.to in self.fail_for:
            raise RuntimeError("Resend fora do ar")
        self.sent.append(email)


@pytest.fixture
def sender() -> FakeSender:
    return FakeSender()


@pytest.fixture
def edvaldo(db_session: Session) -> int:
    return barber_id(db_session, "Edvaldo")


def make_customer(
    session: Session, email: str | None = "ana@example.com", name: str = "Ana"
) -> Customer:
    customer = Customer(name=name, phone="75999990000", email=email)
    session.add(customer)
    session.flush()
    return customer


def booked(
    session: Session,
    barber: int,
    starts_at: datetime,
    *,
    at: datetime = LONG_AGO,
    status: AppointmentStatus = AppointmentStatus.SCHEDULED,
    customer: Customer | None = None,
) -> Appointment:
    """Agendamento marcado em `at` (o `created_at`, que o banco preencheria
    com o relógio real)."""
    appointment = make_appointment(
        session,
        barber=barber,
        starts_at=starts_at,
        status=status,
        customer=customer or make_customer(session),
    )
    appointment.created_at = at
    session.flush()
    return appointment


def reschedule(
    session: Session, appointment: Appointment, starts_at: datetime, *, at: datetime
) -> None:
    """O que a remarcação grava (RN-52): o novo horário e o `RESCHEDULED`."""
    customer = session.get(Customer, appointment.customer_id)
    assert customer is not None and customer.email is not None
    appointment.starts_at = starts_at
    appointment.ends_at = starts_at + timedelta(minutes=appointment.duration_minutes)
    session.add(
        Notification(
            appointment_id=appointment.id,
            kind=NotificationKind.RESCHEDULED,
            recipient=customer.email,
            status=NotificationStatus.SENT,
            sent_at=at,
            created_at=at,
        )
    )
    session.flush()


def reminders_of(session: Session, appointment: Appointment) -> list[Notification]:
    return list(
        session.scalars(
            select(Notification)
            .where(
                Notification.appointment_id == appointment.id,
                Notification.kind == NotificationKind.REMINDER,
            )
            .order_by(Notification.id)
            .execution_options(populate_existing=True)
        ).all()
    )


def run(session: Session, sender: FakeSender, now: datetime = NOW) -> ReminderReport:
    return send_reminders.run(session, sender, lambda: now)


@pytest.mark.parametrize(
    ("ahead", "is_sent"),
    [
        (timedelta(hours=22, minutes=59), False),
        (timedelta(hours=23), True),
        (timedelta(hours=24), True),
        (timedelta(hours=24, minutes=59), True),
        (timedelta(hours=25), False),
    ],
)
def test_rn51_lembrete_so_dos_horarios_entre_23h_e_25h_a_frente(
    db_session: Session,
    sender: FakeSender,
    edvaldo: int,
    ahead: timedelta,
    is_sent: bool,
) -> None:
    appointment = booked(db_session, edvaldo, NOW + ahead)

    report = run(db_session, sender)

    assert report == ReminderReport(sent=int(is_sent))
    assert len(sender.sent) == int(is_sent)
    assert len(reminders_of(db_session, appointment)) == int(is_sent)


def test_rn51_lembrete_vai_ao_cliente_com_o_conteudo_dos_outros_emails(
    db_session: Session, sender: FakeSender, edvaldo: int
) -> None:
    """RN-53: o lembrete reaproveita o template do módulo."""
    appointment = booked(db_session, edvaldo, TOMORROW)

    run(db_session, sender)

    [email] = sender.sent
    [notification] = reminders_of(db_session, appointment)
    assert email.to == "ana@example.com"
    assert email.subject == "Lembrete: seu horário é terça-feira, 3/11, às 10h00"
    assert "Corte + Barba" in email.text
    assert "Edvaldo" in email.text
    assert "/meus-agendamentos" in email.text
    assert email.idempotency_key == f"notification-{notification.id}"
    assert notification.status == NotificationStatus.SENT
    assert notification.recipient == "ana@example.com"
    assert notification.sent_at is not None


def test_rn51_rodar_duas_vezes_envia_um_unico_lembrete(
    db_session: Session, sender: FakeSender, edvaldo: int
) -> None:
    appointment = booked(db_session, edvaldo, TOMORROW)

    first = run(db_session, sender)
    second = run(db_session, sender)
    # A execução seguinte, uma hora depois, ainda o encontra na janela.
    third = run(db_session, sender, NOW + timedelta(hours=1))

    assert first == ReminderReport(sent=1)
    assert second == third == ReminderReport()
    assert len(sender.sent) == 1
    assert len(reminders_of(db_session, appointment)) == 1


def test_rn51_agendamento_feito_3h_antes_nao_recebe_lembrete(
    db_session: Session, sender: FakeSender, edvaldo: int
) -> None:
    starts_at = local(2026, 11, 3, 15)
    booked(db_session, edvaldo, starts_at, at=starts_at - timedelta(hours=3))

    # O job de hora em hora, da criação até o início: nenhuma execução envia.
    for hours_before in range(48, 0, -1):
        run(db_session, sender, starts_at - timedelta(hours=hours_before))

    assert sender.sent == []
    assert db_session.scalar(select(func.count()).select_from(Notification)) == 0


def test_rn51_agendamento_com_menos_de_24h_de_antecedencia_na_janela_nao_recebe(
    db_session: Session, sender: FakeSender, edvaldo: int
) -> None:
    """Marcado há 15 minutos para daqui a 23h30: está na janela, mas a
    antecedência foi de 23h45."""
    appointment = booked(
        db_session,
        edvaldo,
        NOW + timedelta(hours=23, minutes=30),
        at=NOW - timedelta(minutes=15),
    )

    run(db_session, sender)

    assert sender.sent == []
    assert reminders_of(db_session, appointment) == []


def test_rn51_antecedencia_de_exatamente_24h_recebe_lembrete(
    db_session: Session, sender: FakeSender, edvaldo: int
) -> None:
    booked(db_session, edvaldo, TOMORROW, at=NOW)

    assert run(db_session, sender) == ReminderReport(sent=1)


def test_rn51_remarcado_depois_do_lembrete_recebe_outro_para_o_novo_horario(
    db_session: Session, sender: FakeSender, edvaldo: int
) -> None:
    appointment = booked(db_session, edvaldo, TOMORROW)
    run(db_session, sender)
    assert len(sender.sent) == 1

    # Duas horas depois, o cliente passa o horário para dois dias adiante.
    new_start = TOMORROW + timedelta(days=2)
    reschedule(db_session, appointment, new_start, at=NOW + timedelta(hours=2))
    # Antes da janela do novo horário, nada sai; o lembrete do horário antigo
    # não impede o do novo.
    assert run(db_session, sender, NOW + timedelta(hours=3)) == ReminderReport()
    assert run(db_session, sender, new_start - timedelta(hours=24)) == ReminderReport(
        sent=1
    )
    assert run(db_session, sender, new_start - timedelta(hours=23)) == ReminderReport()

    assert len(sender.sent) == 2
    assert sender.sent[1].subject == (
        "Lembrete: seu horário é quinta-feira, 5/11, às 10h00"
    )
    assert len(reminders_of(db_session, appointment)) == 2


def test_rn51_remarcado_com_menos_de_24h_de_antecedencia_nao_recebe_lembrete(
    db_session: Session, sender: FakeSender, edvaldo: int
) -> None:
    """O `RESCHEDULED` já avisou do novo horário, como a confirmação faz."""
    appointment = booked(db_session, edvaldo, TOMORROW + timedelta(days=3))
    new_start = local(2026, 11, 3, 14)
    reschedule(db_session, appointment, new_start, at=new_start - timedelta(hours=10))

    for hours_before in range(10, 0, -1):
        run(db_session, sender, new_start - timedelta(hours=hours_before))
    run(db_session, sender, new_start - timedelta(hours=24))

    assert sender.sent == []


def test_rn51_remarcado_antes_do_lembrete_recebe_so_um_no_novo_horario(
    db_session: Session, sender: FakeSender, edvaldo: int
) -> None:
    appointment = booked(db_session, edvaldo, TOMORROW + timedelta(days=5))
    new_start = TOMORROW
    reschedule(db_session, appointment, new_start, at=NOW - timedelta(days=1))

    run(db_session, sender)
    run(db_session, sender)

    assert len(sender.sent) == 1
    [email] = sender.sent
    assert email.subject.endswith("terça-feira, 3/11, às 10h00")


@pytest.mark.parametrize(
    "status",
    [
        AppointmentStatus.CANCELED,
        AppointmentStatus.COMPLETED,
        AppointmentStatus.NO_SHOW,
    ],
)
def test_rn51_agendamento_que_nao_esta_ativo_nao_recebe_lembrete(
    db_session: Session, sender: FakeSender, edvaldo: int, status: AppointmentStatus
) -> None:
    booked(db_session, edvaldo, TOMORROW, status=status)

    assert run(db_session, sender) == ReminderReport()
    assert sender.sent == []


@pytest.mark.parametrize("email", [None, ""])
def test_rn50_cliente_sem_email_nao_recebe_nem_ganha_registro(
    db_session: Session, sender: FakeSender, edvaldo: int, email: str | None
) -> None:
    booked(
        db_session, edvaldo, TOMORROW, customer=make_customer(db_session, email=email)
    )

    assert run(db_session, sender) == ReminderReport()
    assert db_session.scalar(select(func.count()).select_from(Notification)) == 0


def test_rn54_falha_de_envio_fica_registrada_e_nao_para_o_job(
    db_session: Session,
    sender: FakeSender,
    edvaldo: int,
    caplog: LogCaptureFixture,
) -> None:
    caplog.set_level("WARNING")
    sender.fail_for = {"ana@example.com"}
    failing = booked(db_session, edvaldo, TOMORROW)
    ok = booked(
        db_session,
        barber_id(db_session, "Lauro"),
        TOMORROW + timedelta(minutes=30),
        customer=make_customer(db_session, "bia@example.com", "Bia"),
    )

    report = run(db_session, sender)

    assert report == ReminderReport(sent=1, failed=1)
    [failed] = reminders_of(db_session, failing)
    assert failed.status == NotificationStatus.FAILED
    assert failed.error is not None
    assert "Resend fora do ar" in failed.error
    [delivered] = reminders_of(db_session, ok)
    assert delivered.status == NotificationStatus.SENT
    assert [email.to for email in sender.sent] == ["bia@example.com"]
    assert db_session.get(Appointment, failing.id) is not None
    assert failing.status == AppointmentStatus.SCHEDULED


def test_rn54_lembrete_que_falhou_nao_e_enviado_de_novo(
    db_session: Session, sender: FakeSender, edvaldo: int
) -> None:
    appointment = booked(db_session, edvaldo, TOMORROW)
    sender.fail_for = {"ana@example.com"}
    run(db_session, sender)
    sender.fail_for = set()

    second = run(db_session, sender, NOW + timedelta(hours=1))

    assert second == ReminderReport()
    assert sender.sent == []
    [notification] = reminders_of(db_session, appointment)
    assert notification.status == NotificationStatus.FAILED


def test_rn54_lembrete_registrado_e_nao_enviado_sai_na_proxima_execucao(
    db_session: Session, sender: FakeSender, edvaldo: int
) -> None:
    """O processo caiu entre o commit do registro e o envio."""
    appointment = booked(db_session, edvaldo, TOMORROW)
    pending = Notification(
        appointment_id=appointment.id,
        kind=NotificationKind.REMINDER,
        recipient="ana@example.com",
        created_at=NOW - timedelta(minutes=5),
    )
    db_session.add(pending)
    db_session.flush()

    first = run(db_session, sender, NOW + timedelta(hours=1))
    second = run(db_session, sender, NOW + timedelta(hours=2))

    assert first == ReminderReport(sent=1)
    assert second == ReminderReport()
    assert len(sender.sent) == 1
    assert pending.status == NotificationStatus.SENT
    assert len(reminders_of(db_session, appointment)) == 1


def pending_reminder(
    session: Session, appointment: Appointment, *, at: datetime
) -> Notification:
    pending = Notification(
        appointment_id=appointment.id,
        kind=NotificationKind.REMINDER,
        recipient="ana@example.com",
        created_at=at,
    )
    session.add(pending)
    session.flush()
    return pending


def test_rn54_lembrete_pendente_de_horario_antigo_nao_sai_depois_da_remarcacao(
    db_session: Session, sender: FakeSender, edvaldo: int
) -> None:
    """Registrado, não enviado, e então remarcado: o `PENDING` é do horário
    antigo e não pode sair com o novo horário, nem somar-se ao lembrete novo."""
    appointment = booked(db_session, edvaldo, TOMORROW)
    old = pending_reminder(db_session, appointment, at=NOW)
    new_start = TOMORROW + timedelta(days=2)
    reschedule(db_session, appointment, new_start, at=NOW + timedelta(minutes=30))

    assert run(db_session, sender, new_start - timedelta(hours=24)) == ReminderReport(
        sent=1
    )

    assert old.status == NotificationStatus.PENDING
    assert len(sender.sent) == 1
    assert sender.sent[0].idempotency_key != f"notification-{old.id}"


def test_rn54_lembrete_pendente_de_horario_antigo_nao_sai_se_o_novo_e_em_menos_de_24h(
    db_session: Session, sender: FakeSender, edvaldo: int
) -> None:
    appointment = booked(db_session, edvaldo, TOMORROW + timedelta(days=3))
    old = pending_reminder(db_session, appointment, at=NOW - timedelta(days=1))
    new_start = NOW + timedelta(hours=23, minutes=30)
    reschedule(db_session, appointment, new_start, at=NOW - timedelta(minutes=15))

    assert run(db_session, sender) == ReminderReport()

    assert old.status == NotificationStatus.PENDING
    assert sender.sent == []


@pytest.mark.parametrize(
    ("ahead", "is_sent"),
    [
        (timedelta(hours=22, minutes=59), False),
        (timedelta(hours=23), True),
        (timedelta(hours=25), False),
        (timedelta(hours=-1), False),
    ],
)
def test_rn51_lembrete_pendente_tambem_respeita_a_janela_de_23h_a_25h(
    db_session: Session,
    sender: FakeSender,
    edvaldo: int,
    ahead: timedelta,
    is_sent: bool,
) -> None:
    appointment = booked(db_session, edvaldo, NOW + ahead)
    pending = pending_reminder(db_session, appointment, at=NOW - timedelta(hours=2))

    run(db_session, sender)

    assert len(sender.sent) == int(is_sent)
    assert pending.status == (
        NotificationStatus.SENT if is_sent else NotificationStatus.PENDING
    )


def test_rn54_falha_ao_montar_o_email_conta_como_falha_do_job(
    db_session: Session,
    sender: FakeSender,
    edvaldo: int,
    monkeypatch: MonkeyPatch,
) -> None:
    from app.modules.notifications import service

    def broken(session: Session, notification: Notification) -> Email:
        raise LookupError("template quebrado")

    monkeypatch.setattr(service, "build_email", broken)
    appointment = booked(db_session, edvaldo, TOMORROW)

    assert run(db_session, sender) == ReminderReport(failed=1)

    [notification] = reminders_of(db_session, appointment)
    assert notification.status == NotificationStatus.FAILED
    assert notification.error is not None
    assert "template quebrado" in notification.error


def test_o_relogio_em_utc_nao_muda_a_janela_nem_o_horario_no_email(
    db_session: Session, sender: FakeSender, edvaldo: int
) -> None:
    """00h30 de terça em São Paulo é 03h30 UTC do mesmo dia; segunda 23h em UTC
    ainda é segunda 20h em São Paulo."""
    starts_at = local(2026, 11, 3, 0, 30)
    booked(db_session, edvaldo, starts_at)
    now_utc = (starts_at - timedelta(hours=24)).astimezone(UTC)

    assert run(db_session, sender, now_utc) == ReminderReport(sent=1)

    assert (
        sender.sent[0].subject == "Lembrete: seu horário é terça-feira, 3/11, às 00h30"
    )


def test_o_relogio_do_job_e_o_passado_como_argumento(
    db_session: Session, sender: FakeSender, edvaldo: int
) -> None:
    booked(db_session, edvaldo, TOMORROW)

    assert run(db_session, sender, NOW + timedelta(days=10)) == ReminderReport()
    assert run(db_session, sender, NOW) == ReminderReport(sent=1)


def test_o_relogio_padrao_do_job_e_o_utc_now() -> None:
    from app.clock import utc_now

    assert send_reminders.run.__defaults__ == (utc_now,)


def test_main_roda_o_job_com_a_engine_e_o_remetente_da_configuracao(
    migrated_engine: Engine, monkeypatch: MonkeyPatch, sender: FakeSender
) -> None:
    monkeypatch.setattr(send_reminders, "get_engine", lambda: migrated_engine)
    monkeypatch.setattr(send_reminders, "get_email_sender", lambda: sender)
    calls: list[datetime] = []

    def fake_send(
        session: Session, mail_sender: object, now: datetime
    ) -> ReminderReport:
        calls.append(now)
        assert mail_sender is sender
        return ReminderReport()

    monkeypatch.setattr(send_reminders, "send_due_reminders", fake_send)

    send_reminders.main()

    [now] = calls
    assert now.tzinfo is not None
    assert abs((datetime.now(now.tzinfo) - now).total_seconds()) < 60


# --- Concorrência: conexões próprias, dados confirmados de verdade -----------


@dataclass(frozen=True)
class Committed:
    appointment_id: int


@pytest.fixture
def committed(migrated_engine: Engine) -> Iterator[Committed]:
    """Um agendamento na janela, confirmado no banco para as execuções do job
    usarem conexões próprias. Tudo é apagado no fim, mesmo se o teste falhar."""
    with Session(migrated_engine) as session:
        customer = make_customer(session, "concorrencia@example.com", "Concorrência")
        service = service_by_name(session, "Corte + Barba")
        appointment = Appointment(
            customer_id=customer.id,
            barber_id=barber_id(session, "Edvaldo"),
            service_id=service.id,
            starts_at=TOMORROW,
            ends_at=TOMORROW + timedelta(minutes=45),
            price=service.price,
            duration_minutes=45,
            source=AppointmentSource.ONLINE,
            created_at=LONG_AGO,
        )
        session.add(appointment)
        session.commit()
        ids = (customer.id, appointment.id)
    try:
        yield Committed(appointment_id=ids[1])
    finally:
        with Session(migrated_engine) as session:
            session.execute(
                delete(Notification).where(Notification.appointment_id == ids[1])
            )
            session.execute(delete(Appointment).where(Appointment.id == ids[1]))
            session.execute(delete(Customer).where(Customer.id == ids[0]))
            session.commit()


def count_reminders(engine: Engine, committed: Committed) -> int:
    with engine.connect() as connection:
        return connection.execute(
            text(
                "SELECT count(*) FROM notifications"
                " WHERE appointment_id = :id AND kind = 'REMINDER'"
            ),
            {"id": committed.appointment_id},
        ).scalar_one()


def test_rn51_duas_execucoes_ao_mesmo_tempo_enviam_um_unico_lembrete(
    migrated_engine: Engine, committed: Committed
) -> None:
    barrier = threading.Barrier(2, timeout=10)
    senders = [FakeSender(), FakeSender()]

    def execute(mail_sender: FakeSender) -> ReminderReport:
        with Session(migrated_engine) as session:
            barrier.wait()
            return send_due_reminders(session, mail_sender, NOW)

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(execute, senders))

    assert sum(result.sent for result in results) == 1
    assert sum(len(item.sent) for item in senders) == 1
    assert count_reminders(migrated_engine, committed) == 1


def test_rn51_agendamento_travado_por_outra_execucao_e_pulado(
    migrated_engine: Engine, committed: Committed, sender: FakeSender
) -> None:
    """Enquanto outra transação (outra execução do job ou uma remarcação) segura
    a linha, o job não espera nem registra: a próxima execução cuida dele."""
    with Session(migrated_engine) as holder:
        holder.execute(
            select(Appointment)
            .where(Appointment.id == committed.appointment_id)
            .with_for_update()
        )
        with Session(migrated_engine) as session:
            skipped = send_due_reminders(session, sender, NOW)
        holder.rollback()

    assert skipped == ReminderReport()
    assert count_reminders(migrated_engine, committed) == 0

    with Session(migrated_engine) as session:
        assert send_due_reminders(session, sender, NOW) == ReminderReport(sent=1)
    assert len(sender.sent) == 1


def test_rn51_registro_confere_de_novo_depois_de_travar_o_agendamento(
    migrated_engine: Engine, committed: Committed, sender: FakeSender
) -> None:
    """A outra execução registrou o lembrete entre a leitura da janela e a
    trava: a conferência dentro da trava impede o segundo registro."""
    with Session(migrated_engine) as slow:
        due = list(reminders._due_appointment_ids(slow, NOW))
        slow.commit()
        assert due == [committed.appointment_id]

        with Session(migrated_engine) as fast:
            assert send_due_reminders(fast, sender, NOW) == ReminderReport(sent=1)

        assert reminders._register_reminder(slow, due[0], NOW) is None

    assert count_reminders(migrated_engine, committed) == 1
    assert len(sender.sent) == 1


def test_rn51_cancelado_entre_o_registro_e_o_envio_nao_recebe_lembrete(
    migrated_engine: Engine,
    committed: Committed,
    sender: FakeSender,
    monkeypatch: MonkeyPatch,
) -> None:
    """O cliente cancela (e confirma) depois de o job registrar o lembrete e antes
    de enviar: a conferência com o agendamento travado impede o e-mail."""
    original = reminders._register_reminder

    def register_then_cancel(
        session: Session, appointment_id: int, now: datetime
    ) -> Notification | None:
        registered = original(session, appointment_id, now)
        with Session(migrated_engine) as other:
            other.execute(
                text(
                    "UPDATE appointments SET status = 'CANCELED',"
                    " canceled_at = now(), canceled_by = 'CUSTOMER'"
                    " WHERE id = :id"
                ),
                {"id": appointment_id},
            )
            other.commit()
        return registered

    monkeypatch.setattr(reminders, "_register_reminder", register_then_cancel)

    with Session(migrated_engine) as session:
        report = send_due_reminders(session, sender, NOW)

    assert report == ReminderReport()
    assert sender.sent == []
    with migrated_engine.connect() as connection:
        status = connection.execute(
            text("SELECT status FROM notifications WHERE appointment_id = :id"),
            {"id": committed.appointment_id},
        ).scalar_one()
    assert status == "PENDING"


def test_logger_resume_a_execucao(
    db_session: Session,
    sender: FakeSender,
    edvaldo: int,
    caplog: LogCaptureFixture,
) -> None:
    caplog.set_level("INFO")
    booked(db_session, edvaldo, TOMORROW)

    run(db_session, sender)

    assert "Lembretes: 1 enviados, 0 com falha." in caplog.text
