"""Exportação do relatório financeiro em CSV (RN-01, RN-43, RN-70)."""

import csv
import io
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.appointments.models import AppointmentStatus
from app.modules.customers.models import Customer
from app.modules.payments.models import Payment, PaymentMethod
from tests.factories import barber_id, local, make_appointment
from tests.test_reports import (
    INVALID_DATE,
    INVALID_ORDER,
    NOVEMBER,
    TOO_LONG,
    paid,
)

URL = "/admin/reports/financial.csv"
HEADER = ["Data", "Hora", "Cliente", "Barbeiro", "Serviço", "Pagamento", "Valor (R$)"]


@pytest.fixture
def barbers(db_session: Session) -> dict[str, int]:
    return {
        name: barber_id(db_session, name) for name in ("Edvaldo", "Lauro", "Manoel")
    }


def rows(response_text: str) -> list[list[str]]:
    assert response_text.startswith("﻿")
    return list(csv.reader(io.StringIO(response_text[1:]), delimiter=";"))


def test_rn43_csv_traz_os_concluidos_no_formato_do_excel_pt_br(
    admin: TestClient, db_session: Session, barbers: dict[str, int]
) -> None:
    paid(
        db_session,
        barber=barbers["Edvaldo"],
        starts_at=local(2026, 11, 3, 10, 30),
        amount="1250.50",
        method=PaymentMethod.PIX,
    )
    paid(
        db_session,
        barber=barbers["Lauro"],
        starts_at=local(2026, 11, 4, 14),
        amount="35.00",
        method=PaymentMethod.CREDIT,
    )

    response = admin.get(URL, params=NOVEMBER)

    assert response.status_code == 200
    assert response.headers["content-type"] == "text/csv; charset=utf-8"
    assert response.headers["content-disposition"] == (
        'attachment; filename="relatorio-2026-11-01-a-2026-11-30.csv"'
    )
    # UTF-8 com BOM e CRLF; o acento do cabeçalho sobrevive.
    assert response.content.startswith(b"\xef\xbb\xbf")
    assert b"\r\n" in response.content
    table = rows(response.text)
    assert table[0] == HEADER
    assert table[1] == [
        "03/11/2026",
        "10:30",
        "Cliente de Teste",
        "Edvaldo",
        "Corte + Barba",
        "Pix",
        "1250,50",
    ]
    assert table[2][1] == "14:00"
    assert table[2][5:] == ["Crédito", "35,00"]
    assert len(table) == 3


def test_rn01_csv_usa_a_hora_de_sao_paulo(
    admin: TestClient, db_session: Session, barbers: dict[str, int]
) -> None:
    # 23h30 em São Paulo já é dia 1/12 em UTC.
    paid(
        db_session,
        barber=barbers["Edvaldo"],
        starts_at=local(2026, 11, 30, 23, 30),
        amount="35.00",
    )

    table = rows(admin.get(URL, params=NOVEMBER).text)

    assert table[1][:2] == ["30/11/2026", "23:30"]


def test_rn42_csv_filtra_pelo_barbeiro(
    admin: TestClient, db_session: Session, barbers: dict[str, int]
) -> None:
    paid(
        db_session,
        barber=barbers["Edvaldo"],
        starts_at=local(2026, 11, 3, 10),
        amount="35.00",
    )
    paid(
        db_session,
        barber=barbers["Lauro"],
        starts_at=local(2026, 11, 3, 11),
        amount="40.00",
    )

    table = rows(
        admin.get(URL, params={**NOVEMBER, "barber_id": barbers["Lauro"]}).text
    )

    assert [row[3] for row in table[1:]] == ["Lauro"]


def test_rn43_csv_sem_concluidos_so_tem_o_cabecalho(admin: TestClient) -> None:
    response = admin.get(URL, params=NOVEMBER)

    assert response.status_code == 200
    assert rows(response.text) == [HEADER]


def test_csv_nome_que_parece_formula_vira_texto(
    admin: TestClient, db_session: Session, barbers: dict[str, int]
) -> None:
    customer = Customer(name='=HYPERLINK("x";"y")', phone="75999990000")
    db_session.add(customer)
    db_session.flush()
    appointment = make_appointment(
        db_session,
        barber=barbers["Edvaldo"],
        starts_at=local(2026, 11, 3, 10),
        status=AppointmentStatus.COMPLETED,
        customer=customer,
    )
    db_session.add(
        Payment(
            appointment_id=appointment.id,
            amount=Decimal("35.00"),
            method=PaymentMethod.CASH,
        )
    )
    db_session.flush()

    table = rows(admin.get(URL, params=NOVEMBER).text)

    # O `;` do nome fica entre aspas, e o `=` inicial é neutralizado.
    assert table[1][2] == '\'=HYPERLINK("x";"y")'


def test_rn43_csv_repete_as_validacoes_do_relatorio(
    admin: TestClient, db_session: Session
) -> None:
    inverted = admin.get(URL, params={"start": "2026-11-30", "end": "2026-11-01"})
    assert (inverted.status_code, inverted.json()) == (422, INVALID_ORDER)
    long = admin.get(URL, params={"start": "2025-01-01", "end": "2026-11-30"})
    assert (long.status_code, long.json()) == (422, TOO_LONG)
    last = admin.get(URL, params={"start": "2026-11-01", "end": "9999-12-31"})
    assert (last.status_code, last.json()) == (422, INVALID_DATE)
    missing = admin.get(
        URL, params={**NOVEMBER, "barber_id": barber_id(db_session, "Edvaldo") + 999}
    )
    assert missing.status_code == 404
    assert missing.json()["code"] == "BARBER_NOT_FOUND"


def test_rn70_csv_so_para_a_administracao(
    client: TestClient, customer: TestClient
) -> None:
    assert client.get(URL, params=NOVEMBER).status_code == 401
    assert customer.get(URL, params=NOVEMBER).status_code == 403
