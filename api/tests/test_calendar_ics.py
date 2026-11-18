"""Arquivo de calendário do agendamento: `GET /me/appointments/{id}/calendar.ics`
(RN-01, RN-16, RN-31)."""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.modules.appointments.models import Appointment
from app.modules.booking.calendar import escape_text, fold_line
from app.modules.customers.models import Customer
from app.modules.shop.models import Shop
from tests.factories import barber_id, local, make_appointment, service_by_name
from tests.test_booking import NOW, SUB, TEN, book, customer_app
from tests.test_my_appointments import NOT_ACTIVE, NOT_FOUND


@pytest.fixture
def api(db_session: Session) -> Iterator[TestClient]:
    """Cliente logado (a API cria o cadastro no primeiro acesso)."""
    app = customer_app(lambda: db_session, now=lambda: NOW)
    with TestClient(app) as client:
        yield client


@pytest.fixture
def ana(api: TestClient, db_session: Session) -> Customer:
    """O cliente do `api`, com telefone."""
    response = api.patch("/me/profile", json={"phone": "(11) 98765-4321"})
    assert response.status_code == 200, response.json()
    found = db_session.scalar(select(Customer).where(Customer.auth_user_id == SUB))
    assert found is not None
    return found


@pytest.fixture
def edvaldo(db_session: Session) -> int:
    return barber_id(db_session, "Edvaldo")


@pytest.fixture
def booked(api: TestClient, ana: Customer, edvaldo: int, db_session: Session) -> int:
    """Um agendamento da Ana, criado pela API: terça 3/11, 10h, com o Edvaldo."""
    service = service_by_name(db_session, "Corte + Barba")
    response = book(api, edvaldo, service.id, TEN)
    assert response.status_code == 201, response.json()
    return response.json()["id"]


def url(appointment_id: int) -> str:
    return f"/me/appointments/{appointment_id}/calendar.ics"


def unfold(text: str) -> list[str]:
    assert text.endswith("\r\n")
    return text.replace("\r\n ", "").split("\r\n")[:-1]


def test_rn16_cliente_baixa_o_evento_do_proprio_agendamento(
    api: TestClient, db_session: Session, booked: int
) -> None:
    db_session.execute(
        update(Shop).values(address="Rua das Flores, 123, Centro; Feira de Santana")
    )

    response = api.get(url(booked))

    assert response.status_code == 200
    assert response.headers["content-type"] == "text/calendar; charset=utf-8"
    assert response.headers["content-disposition"] == (
        f'attachment; filename="agendamento-{booked}.ics"'
    )
    lines = unfold(response.text)
    assert lines[0] == "BEGIN:VCALENDAR"
    assert "VERSION:2.0" in lines
    assert "BEGIN:VEVENT" in lines
    assert lines[-2:] == ["END:VEVENT", "END:VCALENDAR"]
    event = dict(line.split(":", 1) for line in lines if ":" in line)
    assert event["UID"] == f"agendamento-{booked}@augustobarbearia"
    # RN-01: terça 3/11/2026 às 10h em São Paulo (UTC-3) = 13h UTC; 45 minutos.
    assert event["DTSTART"] == "20261103T130000Z"
    assert event["DTEND"] == "20261103T134500Z"
    assert event["DTSTAMP"].endswith("Z")
    assert event["SUMMARY"] == "Corte + Barba com Edvaldo — Augusto Barbearia"
    assert event["LOCATION"] == (
        "Augusto Barbearia\\, Rua das Flores\\, 123\\, Centro\\; Feira de Santana"
    )
    assert event["STATUS"] == "CONFIRMED"


def test_rfc5545_linhas_com_ate_75_octetos_e_so_crlf(
    api: TestClient, db_session: Session, booked: int
) -> None:
    db_session.execute(update(Shop).values(address="Avenida " + "Longa " * 12))

    body = api.get(url(booked)).content

    assert b"\r\n " in body  # a linha longa foi dobrada
    for raw in body.split(b"\r\n"):
        assert len(raw) <= 75
    assert b"\n" not in body.replace(b"\r\n", b"")


def test_sem_endereco_o_evento_nao_tem_local(
    api: TestClient, db_session: Session, booked: int
) -> None:
    db_session.execute(update(Shop).values(address=None))

    assert "LOCATION" not in api.get(url(booked)).text


def test_uid_e_estavel_e_o_horario_acompanha_a_remarcacao(
    api: TestClient, db_session: Session, booked: int
) -> None:
    uid = f"UID:agendamento-{booked}@augustobarbearia"
    assert uid in api.get(url(booked)).text
    db_session.execute(
        update(Appointment)
        .where(Appointment.id == booked)
        .values(
            starts_at=local(2026, 11, 4, 11),
            ends_at=local(2026, 11, 4, 11, 45),
        )
    )
    db_session.expire_all()

    after = api.get(url(booked)).text

    assert uid in after
    assert "DTSTART:20261104T140000Z" in after


def test_rn16_agendamento_de_outro_cliente_responde_404(
    api: TestClient, db_session: Session, ana: Customer, edvaldo: int
) -> None:
    other = Customer(name="Outra Pessoa", phone="75988880000")
    db_session.add(other)
    db_session.flush()
    foreign = make_appointment(
        db_session, barber=edvaldo, starts_at=local(2026, 11, 3, 15), customer=other
    )

    response = api.get(url(foreign.id))

    assert (response.status_code, response.json()) == (404, NOT_FOUND)
    assert api.get(url(foreign.id + 9999)).status_code == 404


def test_rn31_agendamento_cancelado_nao_vira_evento(
    api: TestClient, booked: int
) -> None:
    assert api.post(f"/me/appointments/{booked}/cancel").status_code == 200

    response = api.get(url(booked))

    assert (response.status_code, response.json()) == (409, NOT_ACTIVE)


def test_rn70_calendario_so_para_o_cliente_logado(
    client: TestClient, admin: TestClient
) -> None:
    assert client.get(url(1)).status_code == 401
    assert admin.get(url(1)).status_code == 403


def test_escape_e_dobra_de_linha_da_rfc5545() -> None:
    assert escape_text("a,b;c\\d\ne") == "a\\,b\\;c\\\\d\\ne"
    folded = fold_line("SUMMARY:" + "ã" * 60)
    for part in folded.split("\r\n"):
        assert len(part.encode("utf-8")) <= 75
    assert folded.replace("\r\n ", "") == "SUMMARY:" + "ã" * 60
    assert fold_line("curta") == "curta"
