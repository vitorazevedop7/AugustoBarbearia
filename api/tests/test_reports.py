"""Relatório financeiro: período, barbeiro, formas de pagamento e faltas
(RN-01, RN-40, RN-41, RN-42, RN-43, RN-44, RN-70)."""

from datetime import datetime
from decimal import Decimal
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.appointments.models import (
    Appointment,
    AppointmentSource,
    AppointmentStatus,
)
from app.modules.barbers.models import Barber
from app.modules.payments.models import Payment, PaymentMethod
from tests.factories import barber_id, local, make_appointment

NOVEMBER = {"start": "2026-11-01", "end": "2026-11-30"}
INVALID_ORDER = {
    "code": "INVALID_PERIOD",
    "message": "A data final precisa ser igual ou posterior à inicial.",
}
TOO_LONG = {
    "code": "INVALID_PERIOD",
    "message": "Escolha um período de até 366 dias.",
}
INVALID_DATE = {"code": "INVALID_PERIOD", "message": "Escolha uma data válida."}
BARBER_NOT_FOUND = {"code": "BARBER_NOT_FOUND", "message": "Barbeiro não encontrado."}


def report(api: TestClient, **params: object) -> dict[str, Any]:
    response = api.get("/admin/reports/financial", params=params)
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
    method: PaymentMethod = PaymentMethod.PIX,
    price: str = "35.00",
) -> Appointment:
    """Um atendimento concluído com o pagamento (RN-40), direto no banco."""
    appointment = make_appointment(
        session,
        barber=barber,
        starts_at=starts_at,
        price=Decimal(price),
        status=AppointmentStatus.COMPLETED,
    )
    session.add(
        Payment(appointment_id=appointment.id, amount=Decimal(amount), method=method)
    )
    session.flush()
    return appointment


def by_barber(body: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {row["barber"]["name"]: row for row in body["by_barber"]}


def by_method(body: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {row["method"]: row for row in body["by_method"]}


def test_rn43_totais_batem_com_a_lista_o_barbeiro_e_a_forma(
    admin: TestClient, db_session: Session, barbers: dict[str, int]
) -> None:
    paid(
        db_session,
        barber=barbers["Edvaldo"],
        starts_at=local(2026, 11, 3, 10),
        amount="35.00",
        method=PaymentMethod.PIX,
    )
    paid(
        db_session,
        barber=barbers["Edvaldo"],
        starts_at=local(2026, 11, 3, 11),
        amount="25.50",
        method=PaymentMethod.CASH,
    )
    paid(
        db_session,
        barber=barbers["Lauro"],
        starts_at=local(2026, 11, 4, 14),
        amount="60.00",
        method=PaymentMethod.PIX,
    )
    paid(
        db_session,
        barber=barbers["Manoel"],
        starts_at=local(2026, 11, 5, 9),
        amount="40.25",
        method=PaymentMethod.CREDIT,
    )

    body = report(admin, **NOVEMBER)

    assert body["start"] == "2026-11-01"
    assert body["end"] == "2026-11-30"
    assert body["barber_id"] is None
    assert body["total"] == "160.75"
    assert body["completed_count"] == 4
    listed = sum(Decimal(item["amount"]) for item in body["completed"])
    assert listed == Decimal("160.75")
    assert len(body["completed"]) == body["completed_count"]
    # RN-42: o valor conta para o barbeiro do agendamento.
    totals = by_barber(body)
    assert totals["Edvaldo"]["total"] == "60.50"
    assert totals["Edvaldo"]["completed_count"] == 2
    assert totals["Lauro"]["total"] == "60.00"
    assert totals["Manoel"]["total"] == "40.25"
    assert sum(Decimal(row["total"]) for row in body["by_barber"]) == Decimal("160.75")
    assert sum(row["completed_count"] for row in body["by_barber"]) == 4
    # Por forma de pagamento.
    methods = by_method(body)
    assert methods["PIX"] == {"method": "PIX", "total": "95.00", "count": 2}
    assert methods["CASH"] == {"method": "CASH", "total": "25.50", "count": 1}
    assert methods["CREDIT"] == {"method": "CREDIT", "total": "40.25", "count": 1}
    assert sum(Decimal(row["total"]) for row in body["by_method"]) == Decimal("160.75")
    assert sum(row["count"] for row in body["by_method"]) == 4


def test_rn43_lista_traz_data_cliente_barbeiro_servico_valor_e_forma(
    admin: TestClient, db_session: Session, barbers: dict[str, int]
) -> None:
    later = paid(
        db_session,
        barber=barbers["Lauro"],
        starts_at=local(2026, 11, 4, 14),
        amount="60.00",
        method=PaymentMethod.DEBIT,
    )
    first = paid(
        db_session,
        barber=barbers["Edvaldo"],
        starts_at=local(2026, 11, 3, 10),
        amount="35.00",
    )

    body = report(admin, **NOVEMBER)

    assert [item["appointment_id"] for item in body["completed"]] == [
        first.id,
        later.id,
    ]
    assert body["completed"][1] == {
        "appointment_id": later.id,
        "starts_at": "2026-11-04T14:00:00-03:00",
        "customer": {"id": later.customer_id, "name": "Cliente de Teste"},
        "barber": {"id": barbers["Lauro"], "name": "Lauro"},
        "service": {"id": later.service_id, "name": "Corte + Barba"},
        "amount": "60.00",
        "method": "DEBIT",
    }


def test_rn43_as_quatro_formas_aparecem_mesmo_sem_valor(
    admin: TestClient, db_session: Session, barbers: dict[str, int]
) -> None:
    paid(
        db_session,
        barber=barbers["Edvaldo"],
        starts_at=local(2026, 11, 3, 10),
        amount="35.00",
        method=PaymentMethod.DEBIT,
    )

    body = report(admin, **NOVEMBER)

    assert [row["method"] for row in body["by_method"]] == [
        "CASH",
        "PIX",
        "DEBIT",
        "CREDIT",
    ]
    assert by_method(body)["CASH"] == {"method": "CASH", "total": "0.00", "count": 0}
    assert by_method(body)["DEBIT"]["total"] == "35.00"


def test_rn43_periodo_sem_atendimento_traz_zeros_e_lista_vazia(
    admin: TestClient, barbers: dict[str, int]
) -> None:
    body = report(admin, **NOVEMBER)

    assert body["total"] == "0.00"
    assert body["completed_count"] == 0
    assert body["no_show_count"] == 0
    assert body["completed"] == []
    assert all(row["total"] == "0.00" for row in body["by_method"])
    # Os barbeiros ativos aparecem com zeros.
    assert set(by_barber(body)) == {"Edvaldo", "Lauro", "Manoel"}
    assert all(row["total"] == "0.00" for row in body["by_barber"])


def test_rn40_rn41_soma_o_valor_cobrado_nao_o_preco_nem_o_valor_antigo(
    admin: TestClient, db_session: Session, barbers: dict[str, int]
) -> None:
    # Desconto, cortesia e um pagamento corrigido (RN-41): vale o que está em payments.
    paid(
        db_session,
        barber=barbers["Edvaldo"],
        starts_at=local(2026, 11, 3, 10),
        amount="30.00",
        price="35.00",
    )
    paid(
        db_session,
        barber=barbers["Edvaldo"],
        starts_at=local(2026, 11, 3, 11),
        amount="0.00",
        price="35.00",
    )
    corrected = paid(
        db_session,
        barber=barbers["Edvaldo"],
        starts_at=local(2026, 11, 3, 12),
        amount="35.00",
        price="35.00",
    )
    admin.patch(f"/admin/appointments/{corrected.id}/payment", json={"amount": "40.00"})

    body = report(admin, **NOVEMBER)

    assert body["total"] == "70.00"
    # A cortesia conta como atendimento concluído (RN-43).
    assert body["completed_count"] == 3
    assert sorted(item["amount"] for item in body["completed"]) == [
        "0.00",
        "30.00",
        "40.00",
    ]


def test_rn43_soma_decimal_sem_erro_de_arredondamento(
    admin: TestClient, db_session: Session, barbers: dict[str, int]
) -> None:
    for hour, amount in ((10, "0.10"), (11, "0.20"), (12, "0.30")):
        paid(
            db_session,
            barber=barbers["Edvaldo"],
            starts_at=local(2026, 11, 3, hour),
            amount=amount,
        )

    body = report(admin, **NOVEMBER)

    assert body["total"] == "0.60"
    assert by_method(body)["PIX"]["total"] == "0.60"
    assert by_barber(body)["Edvaldo"]["total"] == "0.60"


def test_rn43_agendado_e_cancelado_ficam_fora_das_somas(
    admin: TestClient, db_session: Session, barbers: dict[str, int]
) -> None:
    paid(
        db_session,
        barber=barbers["Edvaldo"],
        starts_at=local(2026, 11, 3, 10),
        amount="35.00",
    )
    for hour, status in (
        (11, AppointmentStatus.SCHEDULED),
        (12, AppointmentStatus.CANCELED),
    ):
        make_appointment(
            db_session,
            barber=barbers["Edvaldo"],
            starts_at=local(2026, 11, 3, hour),
            status=status,
        )

    body = report(admin, **NOVEMBER)

    assert body["total"] == "35.00"
    assert body["completed_count"] == 1
    assert body["no_show_count"] == 0
    assert len(body["completed"]) == 1


def test_rn43_conta_as_faltas_sem_somar_valor(
    admin: TestClient, db_session: Session, barbers: dict[str, int]
) -> None:
    paid(
        db_session,
        barber=barbers["Edvaldo"],
        starts_at=local(2026, 11, 3, 10),
        amount="35.00",
    )
    for barber, hour in (("Edvaldo", 11), ("Edvaldo", 12), ("Lauro", 11)):
        make_appointment(
            db_session,
            barber=barbers[barber],
            starts_at=local(2026, 11, 3, hour),
            status=AppointmentStatus.NO_SHOW,
        )
    # Falta fora do período não conta.
    make_appointment(
        db_session,
        barber=barbers["Edvaldo"],
        starts_at=local(2026, 12, 1, 10),
        status=AppointmentStatus.NO_SHOW,
    )

    body = report(admin, **NOVEMBER)

    assert body["no_show_count"] == 3
    assert body["total"] == "35.00"
    assert body["completed_count"] == 1
    totals = by_barber(body)
    assert totals["Edvaldo"]["no_show_count"] == 2
    assert totals["Lauro"]["no_show_count"] == 1
    assert totals["Manoel"]["no_show_count"] == 0


def test_rn43_filtro_por_barbeiro_vale_para_tudo(
    admin: TestClient, db_session: Session, barbers: dict[str, int]
) -> None:
    paid(
        db_session,
        barber=barbers["Edvaldo"],
        starts_at=local(2026, 11, 3, 10),
        amount="35.00",
        method=PaymentMethod.PIX,
    )
    paid(
        db_session,
        barber=barbers["Lauro"],
        starts_at=local(2026, 11, 3, 10),
        amount="60.00",
        method=PaymentMethod.CASH,
    )
    make_appointment(
        db_session,
        barber=barbers["Lauro"],
        starts_at=local(2026, 11, 3, 15),
        status=AppointmentStatus.NO_SHOW,
    )
    # A falta de outro barbeiro no período não entra no filtro.
    make_appointment(
        db_session,
        barber=barbers["Edvaldo"],
        starts_at=local(2026, 11, 3, 15),
        status=AppointmentStatus.NO_SHOW,
    )

    everyone = report(admin, **NOVEMBER)
    body = report(admin, barber_id=barbers["Lauro"], **NOVEMBER)

    assert everyone["no_show_count"] == 2

    assert body["barber_id"] == barbers["Lauro"]
    assert body["total"] == "60.00"
    assert body["completed_count"] == 1
    assert body["no_show_count"] == 1
    assert [item["barber"]["name"] for item in body["completed"]] == ["Lauro"]
    assert [row["barber"]["name"] for row in body["by_barber"]] == ["Lauro"]
    assert by_method(body)["PIX"]["total"] == "0.00"
    assert by_method(body)["CASH"]["total"] == "60.00"


def test_rn41_correcao_da_forma_move_o_valor_entre_as_formas(
    admin: TestClient, db_session: Session, barbers: dict[str, int]
) -> None:
    appointment = paid(
        db_session,
        barber=barbers["Edvaldo"],
        starts_at=local(2026, 11, 3, 10),
        amount="35.00",
        method=PaymentMethod.PIX,
    )
    before = report(admin, **NOVEMBER)

    fixed = admin.patch(
        f"/admin/appointments/{appointment.id}/payment", json={"method": "CASH"}
    )
    after = report(admin, **NOVEMBER)

    assert fixed.status_code == 200
    assert by_method(before)["PIX"]["total"] == "35.00"
    assert by_method(after)["PIX"] == {"method": "PIX", "total": "0.00", "count": 0}
    assert by_method(after)["CASH"] == {"method": "CASH", "total": "35.00", "count": 1}
    assert after["total"] == "35.00"
    assert after["completed"][0]["method"] == "CASH"


def test_rn43_barbeiro_inexistente_responde_404(admin: TestClient) -> None:
    response = admin.get(
        "/admin/reports/financial", params={"barber_id": 99999, **NOVEMBER}
    )

    assert response.status_code == 404
    assert response.json() == BARBER_NOT_FOUND


def test_rn42_barbeiro_inativo_com_atendimento_aparece_e_sem_atendimento_nao(
    admin: TestClient, db_session: Session, barbers: dict[str, int]
) -> None:
    paid(
        db_session,
        barber=barbers["Lauro"],
        starts_at=local(2026, 11, 3, 10),
        amount="60.00",
    )
    inactive_with_attendance = Barber(name="Zeca", active=True)
    inactive_without = Barber(name="Abel", active=True)
    db_session.add_all([inactive_with_attendance, inactive_without])
    db_session.flush()
    paid(
        db_session,
        barber=inactive_with_attendance.id,
        starts_at=local(2026, 11, 4, 10),
        amount="45.00",
    )
    inactive_with_attendance.active = False
    inactive_without.active = False
    db_session.flush()

    body = report(admin, **NOVEMBER)

    totals = by_barber(body)
    assert totals["Zeca"]["total"] == "45.00"
    assert totals["Zeca"]["barber"]["active"] is False
    assert "Abel" not in totals
    assert body["total"] == "105.00"
    # Filtrando o inativo, o relatório dele funciona.
    only = report(admin, barber_id=inactive_with_attendance.id, **NOVEMBER)
    assert only["total"] == "45.00"
    assert [row["barber"]["name"] for row in only["by_barber"]] == ["Zeca"]


def test_rn42_valor_fica_com_o_barbeiro_do_agendamento_apos_inativar(
    admin: TestClient, db_session: Session, barbers: dict[str, int]
) -> None:
    paid(
        db_session,
        barber=barbers["Manoel"],
        starts_at=local(2026, 11, 3, 10),
        amount="35.00",
    )
    manoel = db_session.get(Barber, barbers["Manoel"])
    assert manoel is not None
    manoel.active = False
    db_session.flush()

    body = report(admin, **NOVEMBER)

    assert by_barber(body)["Manoel"]["total"] == "35.00"


def test_rn01_borda_do_fuso_22h_de_sao_paulo_cai_no_dia_local(
    admin: TestClient, db_session: Session, barbers: dict[str, int]
) -> None:
    # 22h de São Paulo no dia 10 já é 01h do dia 11 em UTC.
    night = paid(
        db_session,
        barber=barbers["Edvaldo"],
        starts_at=local(2026, 11, 10, 22),
        amount="35.00",
    )
    midnight = paid(
        db_session,
        barber=barbers["Lauro"],
        starts_at=local(2026, 11, 11, 0),
        amount="50.00",
    )

    day_10 = report(admin, start="2026-11-10", end="2026-11-10")
    day_11 = report(admin, start="2026-11-11", end="2026-11-11")

    assert [item["appointment_id"] for item in day_10["completed"]] == [night.id]
    assert day_10["total"] == "35.00"
    assert day_10["completed"][0]["starts_at"] == "2026-11-10T22:00:00-03:00"
    assert [item["appointment_id"] for item in day_11["completed"]] == [midnight.id]
    assert day_11["total"] == "50.00"


def test_rn01_borda_do_mes_23h30_do_ultimo_dia_fica_no_mes(
    admin: TestClient, db_session: Session, barbers: dict[str, int]
) -> None:
    paid(
        db_session,
        barber=barbers["Edvaldo"],
        starts_at=local(2026, 10, 31, 23, 30),
        amount="35.00",
    )
    paid(
        db_session,
        barber=barbers["Edvaldo"],
        starts_at=local(2026, 11, 1, 0, 0),
        amount="20.00",
    )
    make_appointment(
        db_session,
        barber=barbers["Lauro"],
        starts_at=local(2026, 10, 31, 23, 30),
        status=AppointmentStatus.NO_SHOW,
    )

    october = report(admin, start="2026-10-01", end="2026-10-31")
    november = report(admin, **NOVEMBER)

    assert october["total"] == "35.00"
    assert october["no_show_count"] == 1
    assert november["total"] == "20.00"
    assert november["no_show_count"] == 0


def test_rn01_conta_pelo_inicio_do_atendimento_e_nao_pela_conclusao(
    admin: TestClient, db_session: Session, barbers: dict[str, int]
) -> None:
    appointment = paid(
        db_session,
        barber=barbers["Edvaldo"],
        starts_at=local(2026, 10, 31, 23, 30),
        amount="35.00",
    )
    # Concluído só no dia 2/11: continua sendo um atendimento de outubro.
    appointment.closed_at = local(2026, 11, 2, 9)
    db_session.flush()

    assert report(admin, start="2026-10-31", end="2026-10-31")["total"] == "35.00"
    assert report(admin, start="2026-11-02", end="2026-11-02")["total"] == "0.00"


def test_rn43_periodo_de_um_dia_inclui_o_ultimo_dia(
    admin: TestClient, db_session: Session, barbers: dict[str, int]
) -> None:
    paid(
        db_session,
        barber=barbers["Edvaldo"],
        starts_at=local(2026, 11, 30, 18, 59),
        amount="35.00",
    )

    assert report(admin, start="2026-11-30", end="2026-11-30")["total"] == "35.00"
    assert report(admin, start="2026-11-01", end="2026-11-29")["total"] == "0.00"


def test_rn43_data_final_antes_da_inicial_e_recusada(admin: TestClient) -> None:
    response = admin.get(
        "/admin/reports/financial", params={"start": "2026-11-10", "end": "2026-11-09"}
    )

    assert response.status_code == 422
    assert response.json() == INVALID_ORDER


def test_rn43_periodo_aceita_366_dias_e_recusa_367(admin: TestClient) -> None:
    # 2024 é bissexto: 1/1 a 31/12 tem 366 dias.
    ok = admin.get(
        "/admin/reports/financial", params={"start": "2024-01-01", "end": "2024-12-31"}
    )
    too_long = admin.get(
        "/admin/reports/financial", params={"start": "2024-01-01", "end": "2025-01-01"}
    )

    assert ok.status_code == 200
    assert too_long.status_code == 422
    assert too_long.json() == TOO_LONG


def test_rn43_ultimo_dia_do_calendario_e_recusado(admin: TestClient) -> None:
    response = admin.get(
        "/admin/reports/financial", params={"start": "9999-12-30", "end": "9999-12-31"}
    )

    assert response.status_code == 422
    assert response.json() == INVALID_DATE


@pytest.mark.parametrize(
    "params",
    [
        {},
        {"start": "2026-11-01"},
        {"end": "2026-11-30"},
        {"start": "01/11/2026", "end": "30/11/2026"},
        {"start": "2026-11-01", "end": "2026-11-30", "barber_id": "abc"},
    ],
)
def test_rn43_periodo_ausente_ou_mal_formatado_e_validation_error(
    admin: TestClient, params: dict[str, str]
) -> None:
    response = admin.get("/admin/reports/financial", params=params)

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"


def test_rn70_so_a_administracao_acessa(
    client: TestClient, customer: TestClient
) -> None:
    assert client.get("/admin/reports/financial", params=NOVEMBER).status_code == 401
    assert customer.get("/admin/reports/financial", params=NOVEMBER).status_code == 403


def test_rn44_atendimento_da_administracao_concluido_entra_como_qualquer_outro(
    admin: TestClient, db_session: Session, barbers: dict[str, int]
) -> None:
    # Sem lançamento avulso: o encaixe é um agendamento da administração concluído.
    appointment = paid(
        db_session,
        barber=barbers["Manoel"],
        starts_at=local(2026, 11, 3, 16),
        amount="35.00",
        method=PaymentMethod.CASH,
    )
    appointment.source = AppointmentSource.ADMIN
    db_session.flush()

    body = report(admin, **NOVEMBER)

    assert body["completed_count"] == 1
    assert body["total"] == "35.00"


def test_rn42_barbeiro_inativo_so_com_falta_aparece(
    admin: TestClient, db_session: Session, barbers: dict[str, int]
) -> None:
    gone = Barber(name="Abel", active=True)
    db_session.add(gone)
    db_session.flush()
    make_appointment(
        db_session,
        barber=gone.id,
        starts_at=local(2026, 11, 3, 10),
        status=AppointmentStatus.NO_SHOW,
    )
    gone.active = False
    db_session.flush()

    body = report(admin, **NOVEMBER)

    row = by_barber(body)["Abel"]
    assert row["barber"]["active"] is False
    assert row["total"] == "0.00"
    assert row["completed_count"] == 0
    assert row["no_show_count"] == 1
    assert body["no_show_count"] == 1


def test_rn43_by_barber_segue_a_ordem_de_nome_do_banco(
    admin: TestClient, db_session: Session, barbers: dict[str, int]
) -> None:
    # Ativos e inativos com atendimento na mesma ordem (nome, id) do banco.
    others = [Barber(name=name, active=True) for name in ("Zeca", "Álvaro", "Abel")]
    db_session.add_all(others)
    db_session.flush()
    for index, barber in enumerate(others):
        paid(
            db_session,
            barber=barber.id,
            starts_at=local(2026, 11, 3, 9 + index),
            amount="10.00",
        )
        barber.active = index == 0  # Álvaro e Abel ficam inativos
    db_session.flush()

    body = report(admin, **NOVEMBER)

    expected = db_session.scalars(
        select(Barber.name)
        .where(Barber.active | Barber.id.in_([other.id for other in others]))
        .order_by(Barber.name, Barber.id)
    ).all()
    assert [row["barber"]["name"] for row in body["by_barber"]] == list(expected)
    assert {"Abel", "Álvaro", "Zeca", "Edvaldo"} <= set(by_barber(body))
