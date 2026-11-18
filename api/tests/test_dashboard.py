"""Painel de indicadores: mês comparado, faturamento diário, ocupação, pico e
hoje (RN-01, RN-02, RN-03, RN-30, RN-45, RN-70)."""

from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import current_user
from app.auth.schemas import CurrentUser
from app.clock import utc_now
from app.db import get_session
from app.main import create_app
from app.modules.appointments.models import Appointment, AppointmentStatus
from app.modules.barbers.models import Barber
from app.modules.dashboard.service import (
    change,
    merged_minutes,
    month_to_date,
    percent,
    previous_month_to_date,
)
from app.modules.payments.models import Payment, PaymentMethod
from app.modules.time_blocks.models import TimeBlock
from tests.factories import barber_id, local, make_appointment

# Quarta-feira, 18/11/2026, 15h em São Paulo.
NOW = local(2026, 11, 18, 15)


def as_admin(db_session: Session, now: datetime = NOW) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_session] = lambda: db_session
    app.dependency_overrides[utc_now] = lambda: now.astimezone(UTC)
    app.dependency_overrides[current_user] = lambda: CurrentUser(
        sub="admin-1", email="admin@example.com", name="Dono", role="admin"
    )
    return TestClient(app)


def dashboard(db_session: Session, now: datetime = NOW) -> dict[str, Any]:
    response = as_admin(db_session, now).get("/admin/dashboard")
    assert response.status_code == 200, response.json()
    return response.json()


@pytest.fixture
def barbers(db_session: Session) -> dict[str, int]:
    return {
        name: barber_id(db_session, name) for name in ("Edvaldo", "Lauro", "Manoel")
    }


def paid(
    session: Session,
    *,
    barber: int,
    starts_at: datetime,
    amount: str,
    duration_minutes: int = 45,
) -> Appointment:
    """Um atendimento concluído com o pagamento (RN-40), direto no banco."""
    appointment = make_appointment(
        session,
        barber=barber,
        starts_at=starts_at,
        duration_minutes=duration_minutes,
        status=AppointmentStatus.COMPLETED,
    )
    session.add(
        Payment(
            appointment_id=appointment.id,
            amount=Decimal(amount),
            method=PaymentMethod.PIX,
        )
    )
    session.flush()
    return appointment


# --- Contas -----------------------------------------------------------------


def test_rn45_mes_anterior_vai_ate_o_mesmo_dia_ou_ate_o_fim_dele() -> None:
    assert month_to_date(date(2026, 11, 18)) == (date(2026, 11, 1), date(2026, 11, 18))
    assert previous_month_to_date(date(2026, 11, 18)) == (
        date(2026, 10, 1),
        date(2026, 10, 18),
    )
    # Fevereiro é mais curto: 31/03 compara com o mês de fevereiro inteiro.
    assert previous_month_to_date(date(2026, 3, 31)) == (
        date(2026, 2, 1),
        date(2026, 2, 28),
    )
    # Janeiro compara com dezembro do ano anterior.
    assert previous_month_to_date(date(2027, 1, 15)) == (
        date(2026, 12, 1),
        date(2026, 12, 15),
    )


def test_rn45_percentual_e_variacao_com_uma_casa_e_sem_base_viram_none() -> None:
    assert percent(1, 3) == Decimal("33.3")
    assert percent(2, 3) == Decimal("66.7")
    assert percent(0, 0) is None
    assert change(Decimal("60.50"), Decimal("50.00")) == Decimal("21.0")
    assert change(1, 2) == Decimal("-50.0")
    assert change(5, 0) is None


def test_rn45_minutos_ocupados_somam_a_uniao_dentro_da_janela() -> None:
    window = (local(2026, 11, 18, 10), local(2026, 11, 18, 19))
    intervals = [
        # Antes da abertura: só conta a partir das 10h (30 min).
        (local(2026, 11, 18, 9, 30), local(2026, 11, 18, 10, 30)),
        # Dois que se cruzam contam uma vez (11h às 12h).
        (local(2026, 11, 18, 11), local(2026, 11, 18, 11, 45)),
        (local(2026, 11, 18, 11, 30), local(2026, 11, 18, 12)),
        # Fora da janela.
        (local(2026, 11, 18, 19), local(2026, 11, 18, 20)),
    ]
    assert merged_minutes(intervals, window) == 90
    assert merged_minutes([], window) == 0


# --- Acesso -----------------------------------------------------------------


def test_rn70_cliente_nao_ve_o_painel(customer: TestClient) -> None:
    response = customer.get("/admin/dashboard")
    assert response.status_code == 403


def test_rn70_sem_login_nao_ve_o_painel(client: TestClient) -> None:
    assert client.get("/admin/dashboard").status_code == 401


# --- Mês corrente ----------------------------------------------------------


def test_rn45_mes_corrente_comparado_ao_mesmo_trecho_do_mes_anterior(
    db_session: Session, barbers: dict[str, int]
) -> None:
    edvaldo, lauro = barbers["Edvaldo"], barbers["Lauro"]
    # Novembro até hoje (18): dois concluídos e uma falta.
    paid(db_session, barber=edvaldo, starts_at=local(2026, 11, 3, 10), amount="35.00")
    paid(db_session, barber=lauro, starts_at=local(2026, 11, 18, 10), amount="25.50")
    make_appointment(
        db_session,
        barber=edvaldo,
        starts_at=local(2026, 11, 5, 10),
        status=AppointmentStatus.NO_SHOW,
    )
    # Não entram: agendado, cancelado e um concluído depois de hoje.
    make_appointment(db_session, barber=edvaldo, starts_at=local(2026, 11, 18, 17))
    make_appointment(
        db_session,
        barber=lauro,
        starts_at=local(2026, 11, 4, 10),
        status=AppointmentStatus.CANCELED,
    )
    paid(db_session, barber=lauro, starts_at=local(2026, 11, 19, 10), amount="99.00")
    # Outubro até o dia 18: dois concluídos; o do dia 19 fica de fora.
    paid(db_session, barber=edvaldo, starts_at=local(2026, 10, 2, 10), amount="30.00")
    paid(db_session, barber=lauro, starts_at=local(2026, 10, 18, 23), amount="20.00")
    paid(db_session, barber=lauro, starts_at=local(2026, 10, 19, 10), amount="100.00")

    body = dashboard(db_session)

    assert body["generated_at"] == "2026-11-18T15:00:00-03:00"
    assert body["current"] == {
        "start": "2026-11-01",
        "end": "2026-11-18",
        "revenue": "60.50",
        "completed_count": 2,
        "no_show_count": 1,
        "no_show_rate": "33.3",
        "average_ticket": "30.25",
    }
    assert body["previous"] == {
        "start": "2026-10-01",
        "end": "2026-10-18",
        "revenue": "50.00",
        "completed_count": 2,
        "no_show_count": 0,
        "no_show_rate": "0.0",
        "average_ticket": "25.00",
    }
    assert body["changes"] == {
        "revenue": "21.0",
        "completed_count": "0.0",
        "average_ticket": "21.0",
        "no_show_rate": "33.3",
    }


def test_rn45_sem_atendimento_os_indicadores_sem_base_vem_nulos(
    db_session: Session, barbers: dict[str, int]
) -> None:
    paid(
        db_session,
        barber=barbers["Edvaldo"],
        starts_at=local(2026, 11, 3, 10),
        amount="35.00",
    )

    body = dashboard(db_session)

    assert body["previous"]["revenue"] == "0.00"
    assert body["previous"]["no_show_rate"] is None
    assert body["previous"]["average_ticket"] is None
    # Sem base no mês anterior, não há variação.
    assert body["changes"] == {
        "revenue": None,
        "completed_count": None,
        "average_ticket": None,
        "no_show_rate": None,
    }
    assert body["current"]["no_show_rate"] == "0.0"


def test_rn45_cortesia_conta_como_concluido_e_puxa_o_ticket_medio(
    db_session: Session, barbers: dict[str, int]
) -> None:
    paid(
        db_session,
        barber=barbers["Edvaldo"],
        starts_at=local(2026, 11, 3, 10),
        amount="35.00",
    )
    paid(
        db_session,
        barber=barbers["Edvaldo"],
        starts_at=local(2026, 11, 4, 10),
        amount="0.00",
    )

    current = dashboard(db_session)["current"]

    assert current["completed_count"] == 2
    assert current["average_ticket"] == "17.50"


# --- Faturamento diário -----------------------------------------------------


def test_rn45_faturamento_dos_ultimos_30_dias_pelo_dia_em_que_comeca(
    db_session: Session, barbers: dict[str, int]
) -> None:
    edvaldo = barbers["Edvaldo"]
    # 22h de São Paulo (01h UTC do dia 11) é do dia 10 (RN-01).
    paid(db_session, barber=edvaldo, starts_at=local(2026, 11, 10, 22), amount="40.00")
    paid(db_session, barber=edvaldo, starts_at=local(2026, 11, 10, 10), amount="35.00")
    paid(db_session, barber=edvaldo, starts_at=local(2026, 10, 20, 10), amount="25.00")
    # Antes da janela (19/10) e depois de hoje: fora.
    paid(db_session, barber=edvaldo, starts_at=local(2026, 10, 19, 10), amount="99.00")
    paid(db_session, barber=edvaldo, starts_at=local(2026, 11, 19, 10), amount="99.00")
    # Falta não fatura.
    make_appointment(
        db_session,
        barber=edvaldo,
        starts_at=local(2026, 11, 12, 10),
        status=AppointmentStatus.NO_SHOW,
    )

    days = dashboard(db_session)["daily_revenue"]

    assert len(days) == 30
    assert days[0] == {"date": "2026-10-20", "revenue": "25.00", "completed_count": 1}
    assert days[-1] == {"date": "2026-11-18", "revenue": "0.00", "completed_count": 0}
    by_day = {day["date"]: day for day in days}
    assert by_day["2026-11-10"] == {
        "date": "2026-11-10",
        "revenue": "75.00",
        "completed_count": 2,
    }
    assert by_day["2026-11-11"]["revenue"] == "0.00"
    assert by_day["2026-11-12"]["revenue"] == "0.00"
    assert sum(Decimal(day["revenue"]) for day in days) == Decimal("100.00")


# --- Ocupação ---------------------------------------------------------------


def test_rn45_ocupacao_por_barbeiro_nos_7_dias_antes_e_a_partir_de_hoje(
    db_session: Session, barbers: dict[str, int]
) -> None:
    edvaldo = barbers["Edvaldo"]
    # Últimos 7 dias (11 a 17/11): concluído e falta ocupam; cancelado não.
    paid(db_session, barber=edvaldo, starts_at=local(2026, 11, 12, 10), amount="35.00")
    make_appointment(
        db_session,
        barber=edvaldo,
        starts_at=local(2026, 11, 13, 10),
        status=AppointmentStatus.NO_SHOW,
    )
    make_appointment(
        db_session,
        barber=edvaldo,
        starts_at=local(2026, 11, 16, 10),
        status=AppointmentStatus.CANCELED,
    )
    # Próximos 7 dias (18 a 24/11): o agendado e a falta no mesmo horário
    # contam uma vez; mais um de 30 min.
    make_appointment(db_session, barber=edvaldo, starts_at=local(2026, 11, 19, 10))
    make_appointment(
        db_session,
        barber=edvaldo,
        starts_at=local(2026, 11, 19, 10),
        status=AppointmentStatus.NO_SHOW,
    )
    make_appointment(
        db_session,
        barber=edvaldo,
        starts_at=local(2026, 11, 20, 10),
        duration_minutes=30,
    )
    # Folga no sábado 21 (RN-03): sai do disponível.
    db_session.add(
        TimeBlock(
            barber_id=edvaldo,
            starts_at=local(2026, 11, 21, 0),
            ends_at=local(2026, 11, 22, 0),
        )
    )
    # Fora das duas janelas.
    make_appointment(db_session, barber=edvaldo, starts_at=local(2026, 11, 10, 10))
    make_appointment(db_session, barber=edvaldo, starts_at=local(2026, 11, 25, 10))
    db_session.flush()

    occupancy = dashboard(db_session)["occupancy"]

    active = list(
        db_session.scalars(
            select(Barber.name).where(Barber.active).order_by(Barber.name, Barber.id)
        )
    )
    assert [row["barber_name"] for row in occupancy] == active
    rows = {row["barber_name"]: row for row in occupancy}
    # RN-02: seg a sex 10h–19h (540 min), sáb 9h–14h (300), dom fechado.
    assert rows["Edvaldo"]["past"] == {
        "start": "2026-11-11",
        "end": "2026-11-17",
        "booked_minutes": 90,
        "available_minutes": 3000,
        "rate": "3.0",
    }
    assert rows["Edvaldo"]["upcoming"] == {
        "start": "2026-11-18",
        "end": "2026-11-24",
        "booked_minutes": 75,
        "available_minutes": 2700,
        "rate": "2.8",
    }
    assert rows["Lauro"]["upcoming"]["booked_minutes"] == 0
    assert rows["Lauro"]["upcoming"]["available_minutes"] == 3000
    assert rows["Lauro"]["upcoming"]["rate"] == "0.0"


def test_rn45_barbeiro_inativo_fica_fora_da_ocupacao(db_session: Session) -> None:
    gone = Barber(name="Abel", active=False)
    db_session.add(gone)
    db_session.flush()

    names = [row["barber_name"] for row in dashboard(db_session)["occupancy"]]

    assert "Abel" not in names


def test_rn45_ocupacao_sem_expediente_vem_nula(
    db_session: Session, barbers: dict[str, int]
) -> None:
    edvaldo = barbers["Edvaldo"]
    # Bloqueia a semana inteira a partir de hoje.
    db_session.add(
        TimeBlock(
            barber_id=edvaldo,
            starts_at=local(2026, 11, 18, 0),
            ends_at=local(2026, 11, 25, 0),
        )
    )
    db_session.flush()

    rows = {row["barber_name"]: row for row in dashboard(db_session)["occupancy"]}

    assert rows["Edvaldo"]["upcoming"]["available_minutes"] == 0
    assert rows["Edvaldo"]["upcoming"]["rate"] is None


# --- Horários de pico -------------------------------------------------------


def test_rn45_pico_por_dia_da_semana_e_hora_nos_90_dias_antes_de_hoje(
    db_session: Session, barbers: dict[str, int]
) -> None:
    edvaldo, lauro = barbers["Edvaldo"], barbers["Lauro"]
    # Terças: 10h30 (concluído) e 10h (agendado que passou) contam na hora 10.
    paid(
        db_session,
        barber=edvaldo,
        starts_at=local(2026, 11, 17, 10, 30),
        amount="35.00",
    )
    make_appointment(db_session, barber=lauro, starts_at=local(2026, 11, 10, 10))
    # 22h fora do expediente estende a grade.
    make_appointment(
        db_session,
        barber=lauro,
        starts_at=local(2026, 11, 3, 22),
        status=AppointmentStatus.NO_SHOW,
    )
    # Fora: cancelado, hoje e antes da janela (90 dias antes de hoje = 20/08).
    make_appointment(
        db_session,
        barber=edvaldo,
        starts_at=local(2026, 11, 10, 11),
        status=AppointmentStatus.CANCELED,
    )
    make_appointment(db_session, barber=edvaldo, starts_at=local(2026, 11, 18, 10))
    make_appointment(db_session, barber=edvaldo, starts_at=local(2026, 8, 19, 10))
    # Primeiro dia da janela: quinta, 20/08, às 9h.
    make_appointment(db_session, barber=edvaldo, starts_at=local(2026, 8, 20, 9))

    peak = dashboard(db_session)["peak_hours"]

    assert peak["start"] == "2026-08-20"
    assert peak["end"] == "2026-11-17"
    # Sábado abre às 9h; seg a sex fecham às 19h (última hora: 18h); 22h estende.
    assert peak["hours"] == list(range(9, 23))
    rows = {row["weekday"]: row for row in peak["rows"]}
    assert [row["weekday"] for row in peak["rows"]] == list(range(7))
    hour = peak["hours"].index
    assert rows[1]["counts"][hour(10)] == 2
    assert rows[1]["counts"][hour(22)] == 1
    assert rows[1]["counts"][hour(11)] == 0
    assert rows[3]["counts"][hour(9)] == 1
    assert rows[2]["counts"][hour(10)] == 0
    assert peak["max_count"] == 2
    assert rows[6]["open"] is False
    assert rows[0]["open"] is True
    assert sum(sum(row["counts"]) for row in peak["rows"]) == 4


def test_rn45_pico_sem_atendimento_segue_o_expediente(db_session: Session) -> None:
    peak = dashboard(db_session)["peak_hours"]

    assert peak["hours"] == list(range(9, 19))
    assert peak["max_count"] == 0
    assert all(count == 0 for row in peak["rows"] for count in row["counts"])


# --- Hoje -------------------------------------------------------------------


def test_painel_mostra_os_proximos_atendimentos_de_hoje(
    db_session: Session, barbers: dict[str, int]
) -> None:
    edvaldo, lauro = barbers["Edvaldo"], barbers["Lauro"]
    paid(db_session, barber=edvaldo, starts_at=local(2026, 11, 18, 10), amount="35.00")
    # Já terminou (11h–11h30): conta no total, mas não está nos próximos.
    make_appointment(
        db_session,
        barber=lauro,
        starts_at=local(2026, 11, 18, 11),
        duration_minutes=30,
    )
    in_progress = make_appointment(
        db_session, barber=edvaldo, starts_at=local(2026, 11, 18, 14, 30)
    )
    later = make_appointment(
        db_session, barber=lauro, starts_at=local(2026, 11, 18, 16)
    )
    # Não entram: cancelado de hoje e agendado de amanhã.
    make_appointment(
        db_session,
        barber=edvaldo,
        starts_at=local(2026, 11, 18, 17),
        status=AppointmentStatus.CANCELED,
    )
    make_appointment(db_session, barber=edvaldo, starts_at=local(2026, 11, 19, 10))

    today = dashboard(db_session)["today"]

    assert today["date"] == "2026-11-18"
    assert today["total_count"] == 4
    assert today["completed_count"] == 1
    assert today["upcoming"] == [
        {
            "id": in_progress.id,
            "starts_at": "2026-11-18T14:30:00-03:00",
            "ends_at": "2026-11-18T15:15:00-03:00",
            "customer_name": "Cliente de Teste",
            "barber_name": "Edvaldo",
            "service_name": "Corte + Barba",
            "in_progress": True,
        },
        {
            "id": later.id,
            "starts_at": "2026-11-18T16:00:00-03:00",
            "ends_at": "2026-11-18T16:45:00-03:00",
            "customer_name": "Cliente de Teste",
            "barber_name": "Lauro",
            "service_name": "Corte + Barba",
            "in_progress": False,
        },
    ]


def test_rn01_hoje_e_o_dia_de_sao_paulo_mesmo_depois_das_21h(
    db_session: Session, barbers: dict[str, int]
) -> None:
    # 22h de 18/11 em São Paulo já é 19/11 em UTC.
    late = local(2026, 11, 18, 22)
    make_appointment(db_session, barber=barbers["Edvaldo"], starts_at=late)

    body = dashboard(db_session, now=local(2026, 11, 18, 21, 30))

    assert body["today"]["date"] == "2026-11-18"
    assert body["current"]["end"] == "2026-11-18"
    assert [item["starts_at"] for item in body["today"]["upcoming"]] == [
        "2026-11-18T22:00:00-03:00"
    ]
