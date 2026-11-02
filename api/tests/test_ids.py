"""Ids fora do `integer` do Postgres respondem 422, nunca 500 (#147, ADR 0008)."""

from typing import Any, Literal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.conftest import client_as

BIG = 2_147_483_648
DATE = "2026-11-20"
STARTS_AT = "2026-11-20T10:00:00-03:00"

Role = Literal["admin", "customer", "public"]

# (quem chama, método, caminho, corpo): o id é o único dado inválido.
ROUTES: list[tuple[Role, str, str, dict[str, Any] | None]] = [
    # No caminho.
    ("admin", "GET", f"/admin/barbers/{BIG}", None),
    ("admin", "PATCH", f"/admin/barbers/{BIG}", {"name": "Novo"}),
    ("admin", "GET", f"/admin/services/{BIG}", None),
    ("admin", "PATCH", f"/admin/services/{BIG}", {"name": "Novo"}),
    ("admin", "GET", f"/admin/appointments/{BIG}", None),
    ("admin", "POST", f"/admin/appointments/{BIG}/complete", {"method": "PIX"}),
    ("admin", "POST", f"/admin/appointments/{BIG}/no-show", None),
    ("admin", "PATCH", f"/admin/appointments/{BIG}/payment", {"method": "PIX"}),
    ("admin", "POST", f"/admin/appointments/{BIG}/cancel", None),
    (
        "admin",
        "POST",
        f"/admin/appointments/{BIG}/reschedule",
        {"starts_at": STARTS_AT},
    ),
    ("admin", "GET", f"/admin/appointments/{BIG}/availability/days", None),
    ("admin", "GET", f"/admin/appointments/{BIG}/availability?date={DATE}", None),
    ("admin", "GET", f"/admin/time-blocks/{BIG}", None),
    ("admin", "DELETE", f"/admin/time-blocks/{BIG}", None),
    ("admin", "GET", f"/admin/customers/{BIG}", None),
    ("customer", "GET", f"/me/appointments/{BIG}", None),
    ("customer", "POST", f"/me/appointments/{BIG}/cancel", None),
    (
        "customer",
        "POST",
        f"/me/appointments/{BIG}/reschedule",
        {"starts_at": STARTS_AT},
    ),
    ("customer", "GET", f"/me/appointments/{BIG}/availability/days", None),
    ("customer", "GET", f"/me/appointments/{BIG}/availability?date={DATE}", None),
    # Na busca.
    (
        "public",
        "GET",
        f"/public/availability?barber_id={BIG}&service_id=1&date={DATE}",
        None,
    ),
    (
        "public",
        "GET",
        f"/public/availability?barber_id=1&service_id={BIG}&date={DATE}",
        None,
    ),
    ("public", "GET", f"/public/availability/days?barber_id={BIG}&service_id=1", None),
    ("public", "GET", f"/public/availability/days?barber_id=1&service_id={BIG}", None),
    (
        "admin",
        "GET",
        f"/admin/availability?barber_id={BIG}&service_id=1&date={DATE}",
        None,
    ),
    ("admin", "GET", f"/admin/availability/days?barber_id=1&service_id={BIG}", None),
    (
        "admin",
        "GET",
        f"/admin/appointments?start={DATE}&end={DATE}&barber_id={BIG}",
        None,
    ),
    (
        "admin",
        "GET",
        f"/admin/reports/financial?start={DATE}&end={DATE}&barber_id={BIG}",
        None,
    ),
    (
        "admin",
        "GET",
        f"/admin/time-blocks?start={DATE}&end={DATE}&barber_id={BIG}",
        None,
    ),
    # No corpo.
    (
        "admin",
        "POST",
        "/admin/services",
        {"name": "Novo", "price": "30.00", "duration_minutes": 30, "barber_ids": [BIG]},
    ),
    ("admin", "PATCH", "/admin/services/1", {"barber_ids": [BIG]}),
    (
        "admin",
        "POST",
        "/admin/time-blocks",
        {"barber_id": BIG, "date": DATE, "all_day": True},
    ),
    (
        "admin",
        "POST",
        "/admin/appointments",
        {"customer_id": BIG, "barber_id": 1, "service_id": 1, "starts_at": STARTS_AT},
    ),
    (
        "admin",
        "POST",
        "/admin/appointments",
        {
            "customer": {"name": "João", "phone": "(75) 99876-5432"},
            "barber_id": BIG,
            "service_id": 1,
            "starts_at": STARTS_AT,
        },
    ),
    (
        "admin",
        "POST",
        "/admin/appointments/1/reschedule",
        {"starts_at": STARTS_AT, "barber_id": BIG},
    ),
    (
        "customer",
        "POST",
        "/me/appointments",
        {"barber_id": 1, "service_id": BIG, "starts_at": STARTS_AT},
    ),
    (
        "customer",
        "POST",
        "/me/appointments/1/reschedule",
        {"starts_at": STARTS_AT, "barber_id": BIG},
    ),
]


@pytest.mark.parametrize(("role", "method", "path", "body"), ROUTES)
def test_id_acima_do_limite_do_banco_responde_422(
    db_session: Session,
    client: TestClient,
    role: Role,
    method: str,
    path: str,
    body: dict[str, Any] | None,
) -> None:
    api = client if role == "public" else client_as(db_session, role)

    response = api.request(method, path, json=body)

    assert response.status_code == 422, response.json()
    assert response.json()["code"] == "VALIDATION_ERROR"


@pytest.mark.parametrize("value", ["0", "-1"])
def test_id_zero_ou_negativo_tambem_responde_422(
    client: TestClient, value: str
) -> None:
    response = client.get(
        f"/public/availability?barber_id={value}&service_id=1&date={DATE}"
    )

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"
