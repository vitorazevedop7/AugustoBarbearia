"""Dados fictícios da demonstração (ADR 0010, #184)."""

from datetime import timedelta

import pytest
from pytest import MonkeyPatch
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.clock import TIMEZONE
from app.config import get_settings
from app.jobs import seed_demo
from app.jobs.seed_demo import (
    DemoAlreadySeededError,
    DemoSeedError,
    SeedReport,
    check_demo_database,
    seed,
)
from app.modules.appointments.models import (
    Appointment,
    AppointmentStatus,
    CanceledBy,
)
from app.modules.customers.models import Customer
from app.modules.payments.models import Payment
from app.modules.time_blocks.models import TimeBlock
from tests.factories import barber_id, local, make_appointment

# Quarta-feira, 15h em São Paulo: há dias passados, hoje e dias futuros.
NOW = local(2026, 11, 11, 15)


@pytest.fixture
def report(db_session: Session) -> SeedReport:
    return seed(db_session, NOW, closed_by="admin@example.com")


def appointments(session: Session) -> list[Appointment]:
    return list(session.scalars(select(Appointment)))


@pytest.mark.parametrize(
    "url",
    [
        "postgresql://augusto:augusto@db:5432/augusto",
        "postgresql://augusto:augusto@db:5432/augusto_test",
        "postgresql://augusto:augusto@db:5432/demo_augusto",
        "postgresql://augusto:augusto@db:5432/",
    ],
)
def test_recusa_banco_que_nao_e_de_demonstracao(url: str) -> None:
    with pytest.raises(DemoSeedError, match="não é de demonstração"):
        check_demo_database(url)


def test_aceita_banco_de_demonstracao() -> None:
    check_demo_database("postgresql://augusto:augusto@db:5432/augusto_demo")


def test_main_recusa_o_banco_de_desenvolvimento(
    monkeypatch: MonkeyPatch,
) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql://augusto:augusto@db:5432/augusto")
    get_settings.cache_clear()
    with pytest.raises(DemoSeedError):
        seed_demo.main()


def test_recusa_banco_que_ja_tem_agendamentos(db_session: Session) -> None:
    make_appointment(db_session, barber=barber_id(db_session, "Edvaldo"), starts_at=NOW)
    customers = db_session.scalar(select(func.count()).select_from(Customer))

    with pytest.raises(DemoAlreadySeededError, match="já tem agendamentos"):
        seed(db_session, NOW)

    assert db_session.scalar(select(func.count()).select_from(Customer)) == customers


def test_cria_clientes_e_todos_os_status(report: SeedReport) -> None:
    # Os fictícios da lista e o cliente da entrada de demonstração (#199).
    assert report.customers == len(seed_demo.CUSTOMERS) + 1
    assert report.completed > 0
    assert report.no_show > 0
    assert report.canceled > 0
    assert report.scheduled > 0
    assert report.time_blocks == 2


def test_clientes_ficticios_sem_email(db_session: Session, report: SeedReport) -> None:
    """Nenhum e-mail sai para um cliente fictício (RN-50, RN-51). Só o cliente
    da entrada de demonstração tem e-mail, num domínio `.local`, que não
    recebe mensagem."""
    emails = db_session.scalars(select(Customer.email)).all()
    assert [email for email in emails if email is not None] == [
        seed_demo.DEMO_CUSTOMER_EMAIL
    ]
    assert seed_demo.DEMO_CUSTOMER_EMAIL.endswith(".local")


def demo_customer(session: Session) -> Customer:
    customer = session.scalar(
        select(Customer).where(Customer.email == seed_demo.DEMO_CUSTOMER_EMAIL)
    )
    assert customer is not None
    return customer


def test_rn10_cliente_da_demonstracao_tem_telefone_e_sem_conta(
    db_session: Session, report: SeedReport
) -> None:
    """O login de demonstração vincula a conta pelo e-mail (RN-23), e o
    telefone já cadastrado deixa agendar sem passar pelo perfil (RN-10)."""
    customer = demo_customer(db_session)
    assert customer.phone == seed_demo.DEMO_CUSTOMER_PHONE
    assert customer.auth_user_id is None


def test_cliente_da_demonstracao_tem_proximo_e_historico(
    db_session: Session, report: SeedReport
) -> None:
    customer = demo_customer(db_session)
    mine = db_session.scalars(
        select(Appointment).where(Appointment.customer_id == customer.id)
    ).all()
    statuses = [appointment.status for appointment in mine]

    # RN-11: um só marcado, para ele ainda poder agendar ao vivo.
    upcoming = [a for a in mine if a.status == AppointmentStatus.SCHEDULED]
    assert len(upcoming) == 1
    # RN-14: dá para remarcar e cancelar sem o aviso de última hora.
    assert upcoming[0].starts_at >= NOW + timedelta(days=1)
    assert statuses.count(AppointmentStatus.COMPLETED) == 2
    assert statuses.count(AppointmentStatus.CANCELED) == 1
    for appointment in mine:
        if appointment.status == AppointmentStatus.CANCELED:
            assert appointment.starts_at < NOW
            assert appointment.canceled_by == CanceledBy.CUSTOMER
        if appointment.status == AppointmentStatus.COMPLETED:
            assert appointment.ends_at <= NOW


def test_status_coerente_com_o_horario(db_session: Session, report: SeedReport) -> None:
    for appointment in appointments(db_session):
        if appointment.status == AppointmentStatus.SCHEDULED:
            assert appointment.ends_at > NOW
        if appointment.status in (
            AppointmentStatus.COMPLETED,
            AppointmentStatus.NO_SHOW,
        ):
            assert appointment.ends_at <= NOW
            assert appointment.closed_at is not None
            assert appointment.closed_at <= NOW
            assert appointment.closed_by == "admin@example.com"
        if appointment.status == AppointmentStatus.CANCELED:
            assert appointment.canceled_at is not None
            assert appointment.canceled_at <= NOW


def test_rn40_so_os_concluidos_tem_pagamento(
    db_session: Session, report: SeedReport
) -> None:
    paid = db_session.execute(
        select(Appointment.status, Appointment.price, Payment.amount).join(
            Payment, Payment.appointment_id == Appointment.id
        )
    ).all()
    assert len(paid) == report.completed
    for status, price, amount in paid:
        assert status == AppointmentStatus.COMPLETED
        assert amount == price


def test_rn03_nenhum_marcado_cruza_um_bloqueio(
    db_session: Session, report: SeedReport
) -> None:
    blocks = db_session.scalars(select(TimeBlock)).all()
    for block in blocks:
        crossing = db_session.scalar(
            select(func.count())
            .select_from(Appointment)
            .where(
                Appointment.barber_id == block.barber_id,
                Appointment.status == AppointmentStatus.SCHEDULED,
                Appointment.starts_at < block.ends_at,
                Appointment.ends_at > block.starts_at,
            )
        )
        assert crossing == 0


def test_rn02_agendamentos_dentro_do_expediente(
    db_session: Session, report: SeedReport
) -> None:
    for appointment in appointments(db_session):
        starts = appointment.starts_at.astimezone(NOW.tzinfo)
        ends = appointment.ends_at.astimezone(NOW.tzinfo)
        assert starts.weekday() != 6  # domingo fechado
        assert starts.date() == ends.date()
        assert starts.minute in (0, 30)  # na grade de 30 minutos (RN-04)


def test_proximos_dias_tem_horario_livre(
    db_session: Session, report: SeedReport
) -> None:
    """A apresentação precisa de horários livres para agendar ao vivo."""
    tomorrow = NOW + timedelta(days=1)
    booked = db_session.scalar(
        select(func.coalesce(func.sum(Appointment.duration_minutes), 0)).where(
            Appointment.status == AppointmentStatus.SCHEDULED,
            Appointment.starts_at >= tomorrow.replace(hour=0),
            Appointment.starts_at < tomorrow.replace(hour=23, minute=59),
        )
    )
    # Três barbeiros, das 10h às 19h: 1620 minutos de expediente.
    assert booked is not None
    assert booked < 1620 * 0.6


def test_historico_alimenta_o_painel(db_session: Session, report: SeedReport) -> None:
    """O painel compara com o mês anterior e olha 90 dias de pico (RN-45)."""
    del report
    completed = [
        appointment.starts_at
        for appointment in appointments(db_session)
        if appointment.status == AppointmentStatus.COMPLETED
    ]
    month_start = local(2026, 11, 1, 0)
    previous_month = [
        starts for starts in completed if local(2026, 10, 1, 0) <= starts < month_start
    ]
    assert previous_month
    assert min(completed) <= NOW - timedelta(days=90)
    # Mais procura na sexta do que na terça (mesmo expediente), como numa barbearia.
    weekdays = [starts.astimezone(TIMEZONE).weekday() for starts in completed]
    assert weekdays.count(4) > weekdays.count(1)
