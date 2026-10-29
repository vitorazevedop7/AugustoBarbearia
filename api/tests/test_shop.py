from datetime import time

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.shop.models import BusinessHours

WEEK = [
    {"weekday": 0, "opens_at": "10:00:00", "closes_at": "19:00:00"},
    {"weekday": 1, "opens_at": "10:00:00", "closes_at": "19:00:00"},
    {"weekday": 2, "opens_at": "10:00:00", "closes_at": "19:00:00"},
    {"weekday": 3, "opens_at": "10:00:00", "closes_at": "19:00:00"},
    {"weekday": 4, "opens_at": "10:00:00", "closes_at": "19:00:00"},
    {"weekday": 5, "opens_at": "09:00:00", "closes_at": "14:00:00"},
    {"weekday": 6, "opens_at": None, "closes_at": None},
]

SHOP = {
    "name": "Augusto Barbearia",
    "tagline": "Corte clássico, atendimento sem pressa",
    "about": "",
    "address": "Rua das Flores, 100 — Centro",
    "phone": "(75) 99999-0000",
    "whatsapp": "75 3333-4444",
    "instagram": "@augusto",
    "email": "contato@example.com",
}


def test_rn02_dados_iniciais_seguem_o_horario_padrao(client: TestClient) -> None:
    response = client.get("/public/shop")

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Augusto Barbearia"
    assert body["business_hours"] == WEEK
    assert body["address"] is None


def test_rn02_administracao_fecha_um_dia(admin: TestClient, client: TestClient) -> None:
    week = [*WEEK]
    week[0] = {"weekday": 0, "opens_at": None, "closes_at": None}

    response = admin.put("/admin/business-hours", json=week)

    assert response.status_code == 200
    assert response.json() == week
    assert client.get("/public/shop").json()["business_hours"][0] == week[0]


def test_rn02_aceita_horas_sem_segundos(admin: TestClient) -> None:
    week = [*WEEK]
    week[5] = {"weekday": 5, "opens_at": "08:30", "closes_at": "13:00"}

    response = admin.put("/admin/business-hours", json=week)

    assert response.status_code == 200
    assert response.json()[5] == {
        "weekday": 5,
        "opens_at": "08:30:00",
        "closes_at": "13:00:00",
    }


@pytest.mark.parametrize(
    ("day", "message"),
    [
        (
            {"weekday": 0, "opens_at": "19:00", "closes_at": "10:00"},
            "Na segunda-feira, a abertura precisa ser antes do fechamento.",
        ),
        (
            {"weekday": 5, "opens_at": "09:00", "closes_at": "09:00"},
            "No sábado, a abertura precisa ser antes do fechamento.",
        ),
        (
            {"weekday": 6, "opens_at": "09:00", "closes_at": None},
            "No domingo, a abertura precisa ser antes do fechamento.",
        ),
    ],
)
def test_rn02_abertura_precisa_ser_antes_do_fechamento(
    admin: TestClient, client: TestClient, day: dict[str, object], message: str
) -> None:
    week: list[dict[str, object]] = [*WEEK]
    week[int(str(day["weekday"]))] = day

    response = admin.put("/admin/business-hours", json=week)

    assert response.status_code == 422
    assert response.json() == {"code": "INVALID_BUSINESS_HOURS", "message": message}
    assert client.get("/public/shop").json()["business_hours"] == WEEK


@pytest.mark.parametrize(
    "week",
    [WEEK[:6], [*WEEK[:6], WEEK[0]], []],
    ids=["seis-dias", "dia-repetido", "vazio"],
)
def test_rn02_exige_os_sete_dias(
    admin: TestClient, week: list[dict[str, object]]
) -> None:
    response = admin.put("/admin/business-hours", json=week)

    assert response.status_code == 422
    assert response.json() == {
        "code": "INVALID_BUSINESS_HOURS",
        "message": "Informe o horário dos sete dias da semana.",
    }


@pytest.mark.parametrize("value", ["10:00:30", "10:00:00-03:00", "25:00"])
def test_rn01_rejeita_hora_com_segundos_fuso_ou_invalida(
    admin: TestClient, value: str
) -> None:
    week = [*WEEK]
    week[0] = {"weekday": 0, "opens_at": value, "closes_at": "19:00"}

    response = admin.put("/admin/business-hours", json=week)

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"


def test_rn02_banco_rejeita_intervalo_invalido(db_session: Session) -> None:
    row = db_session.get(BusinessHours, 0)
    assert row is not None
    row.opens_at = time(19)
    row.closes_at = time(10)

    with pytest.raises(IntegrityError):
        db_session.flush()


def test_rn02_banco_aceita_um_unico_registro_da_barbearia(
    db_session: Session,
) -> None:
    with pytest.raises(IntegrityError):
        db_session.execute(text("INSERT INTO shop (id, name) VALUES (2, 'Outra')"))


def test_administracao_atualiza_dados_normalizados(
    admin: TestClient, client: TestClient
) -> None:
    response = admin.put("/admin/shop", json=SHOP)

    assert response.status_code == 200
    expected = {
        **SHOP,
        "about": None,
        "phone": "75999990000",
        "whatsapp": "7533334444",
        "instagram": "augusto",
        "business_hours": WEEK,
    }
    assert response.json() == expected
    assert client.get("/public/shop").json() == expected


@pytest.mark.parametrize(
    "change",
    [
        {"phone": "9999-0000"},
        {"whatsapp": "+55 (75) 99999-0000"},
        {"name": "   "},
        {"email": "sem-arroba"},
        {"instagram": "@com espaço"},
        {"about": "a" * 1001},
    ],
)
def test_administracao_recebe_erro_de_formato(
    admin: TestClient, change: dict[str, str]
) -> None:
    response = admin.put("/admin/shop", json={**SHOP, **change})

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"


@pytest.mark.parametrize(
    ("method", "path", "payload"),
    [("put", "/admin/shop", SHOP), ("put", "/admin/business-hours", WEEK)],
)
def test_rn70_so_administracao_altera_a_barbearia(
    customer: TestClient,
    client: TestClient,
    method: str,
    path: str,
    payload: object,
) -> None:
    as_customer = customer.request(method, path, json=payload)
    anonymous = client.request(method, path, json=payload)

    assert as_customer.status_code == 403
    assert anonymous.status_code == 401
    assert client.get("/public/shop").json()["address"] is None
