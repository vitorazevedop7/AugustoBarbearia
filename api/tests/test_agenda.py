"""Agenda da administração: período, filtro e detalhe (RN-01, RN-02, RN-30, RN-70)."""

from datetime import timedelta
from decimal import Decimal
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.appointments.models import (
    AppointmentSource,
    AppointmentStatus,
    CanceledBy,
)
from app.modules.barbers.models import Barber
from app.modules.customers.models import Customer
from tests.factories import (
    barber_id,
    local,
    make_appointment,
    make_customer,
    service_by_name,
)

# Semana de segunda, 2/11/2026, a domingo, 8/11/2026.
WEEK = {"start": "2026-11-02", "end": "2026-11-08"}
INVALID_ORDER = {
    "code": "INVALID_PERIOD",
    "message": "A data final precisa ser igual ou posterior à inicial.",
}
TOO_LONG = {"code": "INVALID_PERIOD", "message": "Escolha um período de até 7 dias."}
NOT_FOUND = {"code": "APPOINTMENT_NOT_FOUND", "message": "Agendamento não encontrado."}
BARBER_NOT_FOUND = {"code": "BARBER_NOT_FOUND", "message": "Barbeiro não encontrado."}


def agenda(api: TestClient, **params: object) -> dict[str, Any]:
    response = api.get("/admin/appointments", params=params)
    assert response.status_code == 200, response.json()
    return response.json()


def appointment_ids(body: dict[str, Any]) -> list[int]:
    return [item["id"] for item in body["appointments"]]


@pytest.fixture
def barbers(db_session: Session) -> dict[str, int]:
    return {
        name: barber_id(db_session, name) for name in ("Edvaldo", "Lauro", "Manoel")
    }


def test_rn30_periodo_traz_todos_os_status_dos_tres_barbeiros(
    admin: TestClient, db_session: Session, barbers: dict[str, int]
) -> None:
    before = make_appointment(
        db_session, barber=barbers["Edvaldo"], starts_at=local(2026, 11, 1, 10)
    )
    after = make_appointment(
        db_session, barber=barbers["Edvaldo"], starts_at=local(2026, 11, 9, 10)
    )
    tuesday_manoel = make_appointment(
        db_session, barber=barbers["Manoel"], starts_at=local(2026, 11, 3, 10)
    )
    tuesday_lauro = make_appointment(
        db_session,
        barber=barbers["Lauro"],
        starts_at=local(2026, 11, 3, 10),
        status=AppointmentStatus.NO_SHOW,
    )
    monday = make_appointment(
        db_session,
        barber=barbers["Edvaldo"],
        starts_at=local(2026, 11, 2, 15),
        status=AppointmentStatus.COMPLETED,
    )
    canceled = make_appointment(
        db_session,
        barber=barbers["Edvaldo"],
        starts_at=local(2026, 11, 2, 10),
        status=AppointmentStatus.CANCELED,
    )
    # Ocupa o horário que o cancelado liberou (RN-32): os dois aparecem.
    same_slot = make_appointment(
        db_session, barber=barbers["Edvaldo"], starts_at=local(2026, 11, 2, 10)
    )
    saturday = make_appointment(
        db_session, barber=barbers["Lauro"], starts_at=local(2026, 11, 7, 13)
    )

    body = agenda(admin, **WEEK)

    assert body["start"] == "2026-11-02"
    assert body["end"] == "2026-11-08"
    # Por início, nome do barbeiro e id.
    assert appointment_ids(body) == [
        canceled.id,
        same_slot.id,
        monday.id,
        tuesday_lauro.id,
        tuesday_manoel.id,
        saturday.id,
    ]
    assert before.id not in appointment_ids(body)
    assert after.id not in appointment_ids(body)
    statuses = [item["status"] for item in body["appointments"]]
    assert set(statuses) == {"SCHEDULED", "COMPLETED", "CANCELED", "NO_SHOW"}
    assert [barber["name"] for barber in body["barbers"]] == [
        "Edvaldo",
        "Lauro",
        "Manoel",
    ]


def test_rn02_cada_dia_traz_o_horario_de_funcionamento(admin: TestClient) -> None:
    body = agenda(admin, **WEEK)

    weekday = {"opens_at": "10:00:00", "closes_at": "19:00:00"}
    assert body["days"] == [
        {"date": "2026-11-02", **weekday},
        {"date": "2026-11-03", **weekday},
        {"date": "2026-11-04", **weekday},
        {"date": "2026-11-05", **weekday},
        {"date": "2026-11-06", **weekday},
        {"date": "2026-11-07", "opens_at": "09:00:00", "closes_at": "14:00:00"},
        {"date": "2026-11-08", "opens_at": None, "closes_at": None},
    ]
    assert body["appointments"] == []


def test_rn02_dia_unico_segue_o_horario_alterado(admin: TestClient) -> None:
    hours = admin.get("/public/shop").json()["business_hours"]
    hours[1] = {"weekday": 1, "opens_at": None, "closes_at": None}
    assert admin.put("/admin/business-hours", json=hours).status_code == 200

    body = agenda(admin, start="2026-11-03", end="2026-11-03")

    assert body["days"] == [{"date": "2026-11-03", "opens_at": None, "closes_at": None}]


def test_rn01_agendamento_pertence_ao_dia_em_que_comeca_em_sao_paulo(
    admin: TestClient, db_session: Session, barbers: dict[str, int]
) -> None:
    # 23h30 de segunda em São Paulo é 02h30 UTC de terça.
    late = make_appointment(
        db_session, barber=barbers["Edvaldo"], starts_at=local(2026, 11, 2, 23, 30)
    )
    midnight = make_appointment(
        db_session, barber=barbers["Lauro"], starts_at=local(2026, 11, 3, 0, 0)
    )

    monday = agenda(admin, start="2026-11-02", end="2026-11-02")
    tuesday = agenda(admin, start="2026-11-03", end="2026-11-03")

    assert appointment_ids(monday) == [late.id]
    assert appointment_ids(tuesday) == [midnight.id]
    assert monday["appointments"][0]["starts_at"] == "2026-11-02T23:30:00-03:00"
    assert monday["appointments"][0]["ends_at"] == "2026-11-03T00:15:00-03:00"


def test_filtro_por_barbeiro(
    admin: TestClient, db_session: Session, barbers: dict[str, int]
) -> None:
    lauro = make_appointment(
        db_session, barber=barbers["Lauro"], starts_at=local(2026, 11, 3, 10)
    )
    make_appointment(
        db_session, barber=barbers["Edvaldo"], starts_at=local(2026, 11, 3, 10)
    )

    body = agenda(admin, **WEEK, barber_id=barbers["Lauro"])

    assert appointment_ids(body) == [lauro.id]
    assert body["barbers"] == [
        {"id": barbers["Lauro"], "name": "Lauro", "active": True}
    ]


def test_filtro_por_barbeiro_inexistente(admin: TestClient) -> None:
    response = admin.get("/admin/appointments", params={**WEEK, "barber_id": 999999})

    assert response.status_code == 404
    assert response.json() == BARBER_NOT_FOUND


def test_rn60_inativo_aparece_so_com_agendamento_no_periodo(
    admin: TestClient, db_session: Session, barbers: dict[str, int]
) -> None:
    make_appointment(
        db_session,
        barber=barbers["Manoel"],
        starts_at=local(2026, 11, 3, 10),
        status=AppointmentStatus.COMPLETED,
    )
    for name in ("Lauro", "Manoel"):
        barber = db_session.get(Barber, barbers[name])
        assert barber is not None
        barber.active = False
    db_session.flush()

    week = agenda(admin, **WEEK)
    next_week = agenda(admin, start="2026-11-09", end="2026-11-15")
    filtered = agenda(
        admin, start="2026-11-09", end="2026-11-15", barber_id=barbers["Lauro"]
    )

    assert [barber["name"] for barber in week["barbers"]] == ["Edvaldo", "Manoel"]
    assert [barber["name"] for barber in next_week["barbers"]] == ["Edvaldo"]
    assert filtered["barbers"] == [
        {"id": barbers["Lauro"], "name": "Lauro", "active": False}
    ]


@pytest.mark.parametrize(
    ("params", "expected"),
    [
        ({"start": "2026-11-08", "end": "2026-11-02"}, INVALID_ORDER),
        ({"start": "2026-11-02", "end": "2026-11-09"}, TOO_LONG),
        (
            {"start": "9999-12-31", "end": "9999-12-31"},
            {"code": "INVALID_PERIOD", "message": "Escolha uma data válida."},
        ),
    ],
)
def test_periodo_invalido(
    admin: TestClient, params: dict[str, str], expected: dict[str, str]
) -> None:
    response = admin.get("/admin/appointments", params=params)

    assert response.status_code == 422
    assert response.json() == expected


@pytest.mark.parametrize(
    "params",
    [
        {"start": "2026-11-02"},
        {"end": "2026-11-02"},
        {"start": "02/11/2026", "end": "2026-11-02"},
        {"start": "2026-11-02T10:00:00-03:00", "end": "2026-11-02"},
    ],
)
def test_periodo_em_formato_invalido(admin: TestClient, params: dict[str, str]) -> None:
    response = admin.get("/admin/appointments", params=params)

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"


def test_periodo_de_um_dia_e_de_sete_dias(admin: TestClient) -> None:
    one = agenda(admin, start="2026-11-02", end="2026-11-02")
    seven = agenda(admin, start="2026-11-04", end="2026-11-10")

    assert [day["date"] for day in one["days"]] == ["2026-11-02"]
    assert len(seven["days"]) == 7


def test_detalhe_do_agendamento(
    admin: TestClient, db_session: Session, barbers: dict[str, int]
) -> None:
    customer = Customer(name="Ana Souza", phone="11987654321", email="ana@example.com")
    db_session.add(customer)
    db_session.flush()
    service = service_by_name(db_session, "Corte Simples")
    appointment = make_appointment(
        db_session,
        barber=barbers["Lauro"],
        starts_at=local(2026, 11, 3, 14, 30),
        duration_minutes=30,
        price=Decimal("25.00"),
        service=service,
        customer=customer,
        status=AppointmentStatus.CANCELED,
    )

    response = admin.get(f"/admin/appointments/{appointment.id}")

    assert response.status_code == 200
    assert response.json() == {
        "id": appointment.id,
        "status": "CANCELED",
        "source": "ONLINE",
        "customer": {
            "id": customer.id,
            "name": "Ana Souza",
            "phone": "11987654321",
            "email": "ana@example.com",
        },
        "barber": {"id": barbers["Lauro"], "name": "Lauro", "active": True},
        "service": {"id": service.id, "name": "Corte Simples"},
        "starts_at": "2026-11-03T14:30:00-03:00",
        "ends_at": "2026-11-03T15:00:00-03:00",
        "price": "25.00",
        "duration_minutes": 30,
        # A fábrica cancela um dia antes do início, pelo cliente (RN-33).
        "canceled_at": "2026-11-02T14:30:00-03:00",
        "canceled_by": "CUSTOMER",
        "canceled_late": False,
        "closed_at": None,
        "closed_by": None,
        "payment": None,
    }
    listed = agenda(admin, start="2026-11-03", end="2026-11-03")
    assert listed["appointments"] == [response.json()]


@pytest.mark.parametrize(
    ("canceled_before", "by", "late"),
    [
        (timedelta(minutes=30), CanceledBy.CUSTOMER, True),
        (timedelta(hours=1, minutes=59), CanceledBy.CUSTOMER, True),
        (timedelta(hours=2), CanceledBy.CUSTOMER, False),
        (timedelta(hours=3), CanceledBy.CUSTOMER, False),
        (timedelta(minutes=30), CanceledBy.ADMIN, False),
    ],
)
def test_rn33_agenda_marca_cancelamento_do_cliente_em_cima_da_hora(
    admin: TestClient,
    db_session: Session,
    barbers: dict[str, int],
    canceled_before: timedelta,
    by: CanceledBy,
    late: bool,
) -> None:
    """#142 (RN-14, RN-33): só o cancelamento do cliente nas 2 horas antes do
    início é marcado; o da administração, nunca."""
    starts_at = local(2026, 11, 3, 14)
    appointment = make_appointment(
        db_session,
        barber=barbers["Lauro"],
        starts_at=starts_at,
        status=AppointmentStatus.CANCELED,
    )
    appointment.canceled_at = starts_at - canceled_before
    appointment.canceled_by = by
    db_session.flush()

    detail = admin.get(f"/admin/appointments/{appointment.id}").json()
    [listed] = agenda(admin, start="2026-11-03", end="2026-11-03")["appointments"]

    assert detail["canceled_late"] is late
    assert listed["canceled_late"] is late


def test_detalhe_traz_a_origem_da_administracao(
    admin: TestClient, db_session: Session, barbers: dict[str, int]
) -> None:
    appointment = make_appointment(
        db_session, barber=barbers["Manoel"], starts_at=local(2026, 11, 4, 11)
    )
    appointment.source = AppointmentSource.ADMIN
    db_session.flush()

    body = admin.get(f"/admin/appointments/{appointment.id}").json()

    assert body["source"] == "ADMIN"
    assert body["canceled_at"] is None
    assert body["canceled_by"] is None
    assert body["customer"]["email"] is None


def test_detalhe_inexistente(admin: TestClient) -> None:
    response = admin.get("/admin/appointments/999999")

    assert response.status_code == 404
    assert response.json() == NOT_FOUND


def test_rn70_cliente_recebe_403_e_sem_token_401(
    client: TestClient,
    customer: TestClient,
    db_session: Session,
    barbers: dict[str, int],
) -> None:
    appointment = make_appointment(
        db_session,
        barber=barbers["Edvaldo"],
        starts_at=local(2026, 11, 3, 10),
        customer=make_customer(db_session),
    )

    for path, params in (
        ("/admin/appointments", WEEK),
        (f"/admin/appointments/{appointment.id}", {}),
    ):
        as_customer = customer.get(path, params=params)
        anonymous = client.get(path, params=params)
        assert as_customer.status_code == 403
        assert as_customer.json()["code"] == "HTTP_403"
        assert anonymous.status_code == 401


def test_rn13_agenda_mostra_preco_e_duracao_congelados(
    admin: TestClient, db_session: Session, barbers: dict[str, int]
) -> None:
    service = service_by_name(db_session, "Corte + Barba")
    make_appointment(
        db_session,
        barber=barbers["Edvaldo"],
        starts_at=local(2026, 11, 5, 10),
        duration_minutes=45,
        price=Decimal("35.00"),
        service=service,
    )
    service.price = Decimal("40.00")
    service.duration_minutes = 60
    db_session.flush()

    item = agenda(admin, start="2026-11-05", end="2026-11-05")["appointments"][0]

    assert item["price"] == "35.00"
    assert item["duration_minutes"] == 45
    assert (
        item["ends_at"] == (local(2026, 11, 5, 10) + timedelta(minutes=45)).isoformat()
    )
