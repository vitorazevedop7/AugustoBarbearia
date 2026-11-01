"""Agendamento pela administração: criar, cancelar e remarcar (RN-20 a RN-22)."""

import threading
from collections.abc import Iterator
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pytest import MonkeyPatch
from sqlalchemy import Engine, func, select, text
from sqlalchemy.orm import Session

from app.auth.dependencies import current_user
from app.auth.schemas import CurrentUser
from app.clock import utc_now
from app.db import get_session
from app.main import create_app
from app.modules.admin_booking import service as admin_service
from app.modules.appointments.models import (
    Appointment,
    AppointmentSource,
    AppointmentStatus,
    CanceledBy,
)
from app.modules.barbers.models import Barber
from app.modules.booking import service as booking_service
from app.modules.customers.models import Customer
from tests.factories import (
    barber_id,
    local,
    make_appointment,
    make_customer,
    service_by_name,
)
from tests.test_booking import (
    TEN,
    UNAVAILABLE,
    Person,
    book,
    customer_app,
    ids,
    people,  # noqa: F401  # pyright: ignore[reportUnusedImport]
    real_client,
)

# Segunda-feira, 2/11/2026, 13h50 em São Paulo: das 10h às 19h (RN-02).
NOW = local(2026, 11, 2, 13, 50)
TWO_PM = local(2026, 11, 2, 14)

NOT_FOUND = {"code": "APPOINTMENT_NOT_FOUND", "message": "Agendamento não encontrado."}
NOT_ACTIVE = {
    "code": "APPOINTMENT_NOT_ACTIVE",
    "message": "Este agendamento não está mais ativo.",
}
SAME_SLOT = {
    "code": "SAME_SLOT",
    "message": "Este já é o horário do agendamento. Escolha outro.",
}
EMAIL_TAKEN = {
    "code": "CUSTOMER_EMAIL_TAKEN",
    "message": "Já existe um cliente cadastrado com este e-mail.",
}
CUSTOMER_NOT_FOUND = {
    "code": "CUSTOMER_NOT_FOUND",
    "message": "Cliente não encontrado.",
}
VALIDATION = {
    "code": "VALIDATION_ERROR",
    "message": "Confira os dados informados e tente novamente.",
}
NEW_CUSTOMER = {"name": "João Balcão", "phone": "(75) 99876-5432"}


class Clock:
    def __init__(self) -> None:
        self.now = NOW.astimezone(UTC)


@pytest.fixture
def clock() -> Clock:
    return Clock()


def admin_app(get_session_override: Any, now: Any) -> FastAPI:
    app = create_app()
    app.dependency_overrides[get_session] = get_session_override
    app.dependency_overrides[utc_now] = now
    app.dependency_overrides[current_user] = lambda: CurrentUser(
        sub="admin-1", email="admin@example.com", name="Recepção", role="admin"
    )
    return app


@pytest.fixture
def api(db_session: Session, clock: Clock) -> Iterator[TestClient]:
    """A administração, com o relógio do teste."""
    with TestClient(admin_app(lambda: db_session, lambda: clock.now)) as client:
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
def ana(db_session: Session) -> Customer:
    return make_customer(db_session)


def create(
    api: TestClient,
    barber: int,
    service: int,
    starts_at: datetime | str,
    **customer: Any,
) -> Any:
    value = starts_at if isinstance(starts_at, str) else starts_at.isoformat()
    return api.post(
        "/admin/appointments",
        json={
            "barber_id": barber,
            "service_id": service,
            "starts_at": value,
            **customer,
        },
    )


def cancel(api: TestClient, appointment_id: int) -> Any:
    return api.post(f"/admin/appointments/{appointment_id}/cancel")


def reschedule(
    api: TestClient, appointment_id: int, starts_at: datetime, **extra: Any
) -> Any:
    return api.post(
        f"/admin/appointments/{appointment_id}/reschedule",
        json={"starts_at": starts_at.isoformat(), **extra},
    )


def admin_starts(api: TestClient, barber: int, service: int, day: str) -> list[str]:
    response = api.get(
        "/admin/availability",
        params={"barber_id": barber, "service_id": service, "date": day},
    )
    assert response.status_code == 200, response.json()
    return [slot["starts_at"] for slot in response.json()["slots"]]


def stored(session: Session, appointment_id: int) -> Appointment:
    session.expire_all()
    appointment = session.get(Appointment, appointment_id)
    assert appointment is not None
    return appointment


def customers_named(session: Session, name: str) -> int:
    return session.scalar(select(func.count()).where(Customer.name == name)) or 0


# Criar (RN-13, RN-20, RN-21).


def test_rn20_rn13_administracao_agenda_cliente_ja_cadastrado(
    api: TestClient,
    db_session: Session,
    ana: Customer,
    edvaldo: int,
    corte_e_barba: int,
) -> None:
    response = create(api, edvaldo, corte_e_barba, TEN, customer_id=ana.id)

    assert response.status_code == 201, response.json()
    body = response.json()
    assert body["status"] == "SCHEDULED"
    assert body["source"] == "ADMIN"
    assert body["customer"] == {
        "id": ana.id,
        "name": "Cliente de Teste",
        "phone": "75999990000",
        "email": None,
    }
    assert body["barber"]["id"] == edvaldo
    assert body["service"] == {"id": corte_e_barba, "name": "Corte + Barba"}
    assert body["starts_at"] == "2026-11-03T10:00:00-03:00"
    assert body["ends_at"] == "2026-11-03T10:45:00-03:00"
    assert body["price"] == "35.00"
    assert body["duration_minutes"] == 45
    assert body["canceled_at"] is None and body["canceled_by"] is None
    saved = stored(db_session, body["id"])
    assert saved.source == AppointmentSource.ADMIN
    assert saved.customer_id == ana.id


def test_rn13_preco_e_duracao_congelados_no_agendamento_da_administracao(
    api: TestClient, db_session: Session, ana: Customer, edvaldo: int
) -> None:
    service = service_by_name(db_session, "Corte + Barba")
    response = create(api, edvaldo, service.id, TEN, customer_id=ana.id)
    service.price = Decimal("50.00")
    service.duration_minutes = 60
    db_session.flush()

    saved = stored(db_session, response.json()["id"])

    assert saved.price == Decimal("35.00")
    assert saved.duration_minutes == 45


def test_rn20_cliente_novo_cadastrado_na_hora(
    api: TestClient, db_session: Session, edvaldo: int, corte_e_barba: int
) -> None:
    response = create(
        api,
        edvaldo,
        corte_e_barba,
        TEN,
        customer={**NEW_CUSTOMER, "email": " Joao@Example.com "},
    )

    assert response.status_code == 201, response.json()
    customer = response.json()["customer"]
    assert customer["name"] == "João Balcão"
    assert customer["phone"] == "75998765432"
    assert customer["email"] == "joao@example.com"
    created = db_session.get(Customer, customer["id"])
    assert created is not None
    assert created.auth_user_id is None


def test_rn20_cliente_novo_sem_email(
    api: TestClient, edvaldo: int, corte_e_barba: int
) -> None:
    response = create(api, edvaldo, corte_e_barba, TEN, customer=NEW_CUSTOMER)

    assert response.status_code == 201, response.json()
    assert response.json()["customer"]["email"] is None


def test_rn20_cliente_novo_nao_fica_gravado_se_o_horario_for_recusado(
    api: TestClient, db_session: Session, edvaldo: int, corte_e_barba: int
) -> None:
    make_appointment(db_session, barber=edvaldo, starts_at=TEN)

    response = create(api, edvaldo, corte_e_barba, TEN, customer=NEW_CUSTOMER)

    assert response.status_code == 409
    assert response.json() == UNAVAILABLE
    assert customers_named(db_session, "João Balcão") == 0


def test_rn20_rn23_email_repetido_nao_grava_nada(
    api: TestClient, db_session: Session, edvaldo: int, corte_e_barba: int
) -> None:
    db_session.add(Customer(name="Outro", phone="75999990001", email="joao@x.com"))
    db_session.flush()

    response = create(
        api,
        edvaldo,
        corte_e_barba,
        TEN,
        customer={**NEW_CUSTOMER, "email": "JOAO@x.com"},
    )

    assert response.status_code == 409
    assert response.json() == EMAIL_TAKEN
    assert customers_named(db_session, "João Balcão") == 0
    assert db_session.scalar(select(func.count()).select_from(Appointment)) == 0


@pytest.mark.parametrize(
    "customer",
    [
        {},
        {"customer_id": 1, "customer": NEW_CUSTOMER},
        {"customer": {"name": "João", "phone": "123"}},
        {"customer": {"name": "  ", "phone": "(75) 99876-5432"}},
        {"customer": {"name": "João"}},
        {"customer": {**NEW_CUSTOMER, "email": "sem-arroba"}},
        {"customer": NEW_CUSTOMER, "source": "ONLINE"},
    ],
)
def test_rn20_rn62_corpo_invalido(
    api: TestClient,
    db_session: Session,
    edvaldo: int,
    corte_e_barba: int,
    customer: dict[str, Any],
) -> None:
    response = create(api, edvaldo, corte_e_barba, TEN, **customer)

    assert response.status_code == 422
    assert response.json() == VALIDATION
    assert db_session.scalar(select(func.count()).select_from(Appointment)) == 0


def test_rn20_cliente_inexistente(
    api: TestClient, edvaldo: int, corte_e_barba: int
) -> None:
    response = create(api, edvaldo, corte_e_barba, TEN, customer_id=999_999)

    assert response.status_code == 404
    assert response.json() == CUSTOMER_NOT_FOUND


def test_rn20_cliente_do_google_sem_telefone_tambem_e_agendado(
    api: TestClient, db_session: Session, edvaldo: int, corte_e_barba: int
) -> None:
    google = Customer(name="Google", email="g@example.com", auth_user_id="google-1")
    db_session.add(google)
    db_session.flush()

    response = create(api, edvaldo, corte_e_barba, TEN, customer_id=google.id)

    assert response.status_code == 201, response.json()


def test_rn21_rn06_encaixe_daqui_a_10_minutos_aceito_pela_administracao(
    api: TestClient,
    db_session: Session,
    clock: Clock,
    ana: Customer,
    edvaldo: int,
    corte_e_barba: int,
) -> None:
    """Às 13h50, o horário das 14h00 é recusado ao cliente (RN-06) e aceito
    pela administração (RN-21)."""
    online = customer_app(lambda: db_session, now=lambda: clock.now)
    with TestClient(online) as as_customer:
        as_customer.patch("/me/profile", json={"phone": "(11) 98765-4321"})
        refused = book(as_customer, edvaldo, corte_e_barba, TWO_PM)
    assert refused.status_code == 409
    assert refused.json() == UNAVAILABLE

    response = create(api, edvaldo, corte_e_barba, TWO_PM, customer_id=ana.id)

    assert response.status_code == 201, response.json()


def test_rn21_rn04_rn44_encaixe_no_horario_da_grade_que_ja_comecou(
    api: TestClient,
    clock: Clock,
    ana: Customer,
    edvaldo: int,
    corte_e_barba: int,
) -> None:
    """Às 14h10, o horário das 14h00 ainda é oferecido e aceito (encaixe da
    RN-44); 14h10, fora da grade (RN-04), não existe."""
    clock.now = local(2026, 11, 2, 14, 10).astimezone(UTC)

    starts = admin_starts(api, edvaldo, corte_e_barba, "2026-11-02")
    off_grid = create(
        api,
        edvaldo,
        corte_e_barba,
        local(2026, 11, 2, 14, 10),
        customer_id=ana.id,
    )
    on_grid = create(api, edvaldo, corte_e_barba, TWO_PM, customer_id=ana.id)

    assert "2026-11-02T14:00:00-03:00" in starts
    assert off_grid.status_code == 409
    assert off_grid.json() == UNAVAILABLE
    assert on_grid.status_code == 201, on_grid.json()


def test_rn21_horario_da_manha_de_hoje_ainda_e_oferecido(
    api: TestClient, ana: Customer, edvaldo: int, corte_e_barba: int
) -> None:
    """Sem antecedência (RN-21), um atendimento que já aconteceu hoje pode ser
    registrado depois (RN-44)."""
    response = create(
        api, edvaldo, corte_e_barba, local(2026, 11, 2, 10), customer_id=ana.id
    )

    assert response.status_code == 201, response.json()


def test_rn21_sem_janela_de_30_dias(
    api: TestClient, ana: Customer, edvaldo: int, corte_e_barba: int
) -> None:
    far = local(2027, 1, 4, 10)  # Uma segunda, 63 dias depois.

    response = create(api, edvaldo, corte_e_barba, far, customer_id=ana.id)

    assert response.status_code == 201, response.json()


def test_rn21_rn11_sem_limite_de_agendamentos_por_cliente(
    api: TestClient,
    db_session: Session,
    ana: Customer,
    edvaldo: int,
    corte_e_barba: int,
) -> None:
    for day in (3, 4):
        make_appointment(
            db_session, barber=edvaldo, starts_at=local(2026, 11, day, 10), customer=ana
        )

    third = create(
        api, edvaldo, corte_e_barba, local(2026, 11, 5, 10), customer_id=ana.id
    )
    fourth = create(
        api, edvaldo, corte_e_barba, local(2026, 11, 6, 10), customer_id=ana.id
    )

    assert third.status_code == 201, third.json()
    assert fourth.status_code == 201, fourth.json()


def test_rn21_dia_que_ja_passou_nao_tem_horario(
    api: TestClient, ana: Customer, edvaldo: int, corte_e_barba: int
) -> None:
    yesterday = local(2026, 10, 30, 10)  # Sexta-feira.

    response = create(api, edvaldo, corte_e_barba, yesterday, customer_id=ana.id)

    assert response.status_code == 409
    assert response.json() == UNAVAILABLE
    assert admin_starts(api, edvaldo, corte_e_barba, "2026-10-30") == []


@pytest.mark.parametrize(
    ("label", "starts_at"),
    [
        ("ocupado", TEN + timedelta(minutes=30)),
        ("passa do fechamento", local(2026, 11, 3, 18, 30)),
        ("domingo fechado", local(2026, 11, 8, 10)),
    ],
)
def test_rn05_rn08_rn21_itens_1_a_5_continuam_valendo(
    api: TestClient,
    db_session: Session,
    ana: Customer,
    edvaldo: int,
    corte_e_barba: int,
    label: str,
    starts_at: datetime,
) -> None:
    make_appointment(db_session, barber=edvaldo, starts_at=TEN)

    response = create(api, edvaldo, corte_e_barba, starts_at, customer_id=ana.id)

    assert response.status_code == 409, label
    assert response.json() == UNAVAILABLE


def test_rn05_item5_rn21_barbeiro_inativo_nao_recebe_agendamento(
    api: TestClient,
    db_session: Session,
    ana: Customer,
    edvaldo: int,
    corte_e_barba: int,
) -> None:
    barber = db_session.get(Barber, edvaldo)
    assert barber is not None
    barber.active = False
    db_session.flush()

    response = create(api, edvaldo, corte_e_barba, TEN, customer_id=ana.id)

    assert response.status_code == 409
    assert response.json() == UNAVAILABLE


def test_barbeiro_ou_servico_inexistente(
    api: TestClient, ana: Customer, edvaldo: int, corte_e_barba: int
) -> None:
    no_barber = create(api, 999_999, corte_e_barba, TEN, customer_id=ana.id)
    no_service = create(api, edvaldo, 999_999, TEN, customer_id=ana.id)

    assert no_barber.status_code == 404
    assert no_barber.json()["code"] == "BARBER_NOT_FOUND"
    assert no_service.status_code == 404
    assert no_service.json()["code"] == "SERVICE_NOT_FOUND"


# Horários da administração (RN-21).


def test_rn21_horarios_de_hoje_sem_antecedencia(
    api: TestClient,
    db_session: Session,
    clock: Clock,
    edvaldo: int,
    corte_e_barba: int,
) -> None:
    make_appointment(db_session, barber=edvaldo, starts_at=local(2026, 11, 2, 11))
    online = customer_app(lambda: db_session, now=lambda: clock.now)

    starts = admin_starts(api, edvaldo, corte_e_barba, "2026-11-02")
    with TestClient(online) as as_customer:
        public = as_customer.get(
            "/public/availability",
            params={
                "barber_id": edvaldo,
                "service_id": corte_e_barba,
                "date": "2026-11-02",
            },
        ).json()["slots"]

    assert starts[0] == "2026-11-02T10:00:00-03:00"
    assert "2026-11-02T11:00:00-03:00" not in starts  # ocupado (RN-08)
    assert "2026-11-02T14:00:00-03:00" in starts
    assert starts[-1] == "2026-11-02T18:00:00-03:00"
    assert public[0]["starts_at"] == "2026-11-02T15:00:00-03:00"


def test_rn21_dias_da_administracao_vao_de_hoje_a_hoje_mais_30(
    api: TestClient, edvaldo: int, corte_e_barba: int
) -> None:
    response = api.get(
        "/admin/availability/days",
        params={"barber_id": edvaldo, "service_id": corte_e_barba},
    )

    assert response.status_code == 200, response.json()
    days = response.json()["days"]
    assert days[0] == "2026-11-02"
    assert "2026-11-08" not in days  # domingo fechado
    assert days[-1] == "2026-12-02"


# Cancelar (RN-22, RN-31 a RN-33).


def test_rn22_rn33_administracao_cancela_30_minutos_antes(
    api: TestClient,
    db_session: Session,
    clock: Clock,
    edvaldo: int,
    corte_e_barba: int,
) -> None:
    clock.now = local(2026, 11, 2, 13, 30).astimezone(UTC)
    appointment = make_appointment(db_session, barber=edvaldo, starts_at=TWO_PM)
    assert "2026-11-02T14:00:00-03:00" not in admin_starts(
        api, edvaldo, corte_e_barba, "2026-11-02"
    )

    response = cancel(api, appointment.id)

    assert response.status_code == 200, response.json()
    body = response.json()
    assert body["status"] == "CANCELED"
    assert body["canceled_by"] == "ADMIN"
    assert body["canceled_at"] == "2026-11-02T13:30:00-03:00"
    saved = stored(db_session, appointment.id)
    assert saved.status == AppointmentStatus.CANCELED
    assert saved.canceled_by == CanceledBy.ADMIN
    # RN-32: a vaga volta na hora.
    assert "2026-11-02T14:00:00-03:00" in admin_starts(
        api, edvaldo, corte_e_barba, "2026-11-02"
    )


def test_rn22_cancela_agendamento_que_ja_comecou(
    api: TestClient, db_session: Session, edvaldo: int
) -> None:
    started = make_appointment(
        db_session, barber=edvaldo, starts_at=local(2026, 11, 2, 13, 30)
    )

    response = cancel(api, started.id)

    assert response.status_code == 200, response.json()
    assert response.json()["status"] == "CANCELED"


@pytest.mark.parametrize(
    "final",
    [
        AppointmentStatus.CANCELED,
        AppointmentStatus.COMPLETED,
        AppointmentStatus.NO_SHOW,
    ],
)
def test_rn31_status_final_nao_cancela_nem_remarca(
    api: TestClient,
    db_session: Session,
    edvaldo: int,
    corte_e_barba: int,
    final: AppointmentStatus,
) -> None:
    appointment = make_appointment(
        db_session, barber=edvaldo, starts_at=TEN, status=final
    )

    canceled = cancel(api, appointment.id)
    moved = reschedule(api, appointment.id, TEN + timedelta(hours=2))
    days = api.get(f"/admin/appointments/{appointment.id}/availability/days")

    for response in (canceled, moved, days):
        assert response.status_code == 409
        assert response.json() == NOT_ACTIVE
    assert stored(db_session, appointment.id).status == final


def test_agendamento_inexistente(api: TestClient) -> None:
    for response in (
        cancel(api, 999_999),
        reschedule(api, 999_999, TEN),
        api.get(
            "/admin/appointments/999999/availability", params={"date": "2026-11-03"}
        ),
    ):
        assert response.status_code == 404
        assert response.json() == NOT_FOUND


# Remarcar (RN-15, RN-22).


def test_rn22_rn15_administracao_remarca_sem_prazo(
    api: TestClient,
    db_session: Session,
    edvaldo: int,
    lauro: int,
    corte_e_barba: int,
) -> None:
    """A 10 minutos do início, fora do prazo do cliente (RN-14), a
    administração remarca para outro barbeiro e horário. Preço, duração e
    origem continuam os da criação (RN-13)."""
    appointment = make_appointment(
        db_session, barber=edvaldo, starts_at=TWO_PM, price=Decimal("30.00")
    )

    response = reschedule(api, appointment.id, local(2026, 11, 2, 16), barber_id=lauro)

    assert response.status_code == 200, response.json()
    body = response.json()
    assert body["id"] == appointment.id
    assert body["status"] == "SCHEDULED"
    assert body["source"] == "ONLINE"
    assert body["barber"]["id"] == lauro
    assert body["starts_at"] == "2026-11-02T16:00:00-03:00"
    assert body["ends_at"] == "2026-11-02T16:45:00-03:00"
    assert body["price"] == "30.00"
    assert body["duration_minutes"] == 45
    # RN-32: o horário antigo fica livre.
    assert "2026-11-02T14:00:00-03:00" in admin_starts(
        api, edvaldo, corte_e_barba, "2026-11-02"
    )


def test_rn15_rn22_sem_barbeiro_continua_o_mesmo_e_pode_cruzar_o_atual(
    api: TestClient, db_session: Session, edvaldo: int
) -> None:
    appointment = make_appointment(db_session, barber=edvaldo, starts_at=TWO_PM)

    response = reschedule(api, appointment.id, local(2026, 11, 2, 14, 30))

    assert response.status_code == 200, response.json()
    assert response.json()["barber"]["id"] == edvaldo
    assert response.json()["starts_at"] == "2026-11-02T14:30:00-03:00"


def test_rn15_mesmo_horario_e_recusado(
    api: TestClient, db_session: Session, edvaldo: int
) -> None:
    appointment = make_appointment(db_session, barber=edvaldo, starts_at=TEN)

    response = reschedule(api, appointment.id, TEN, barber_id=edvaldo)

    assert response.status_code == 409
    assert response.json() == SAME_SLOT


def test_rn15_corpo_nao_troca_o_servico(
    api: TestClient, db_session: Session, edvaldo: int
) -> None:
    appointment = make_appointment(db_session, barber=edvaldo, starts_at=TEN)
    corte = service_by_name(db_session, "Corte Simples")

    response = reschedule(
        api, appointment.id, TEN + timedelta(hours=1), service_id=corte.id
    )

    assert response.status_code == 422
    assert response.json() == VALIDATION


def test_rn08_rn22_novo_horario_ocupado_e_recusado(
    api: TestClient, db_session: Session, edvaldo: int
) -> None:
    appointment = make_appointment(db_session, barber=edvaldo, starts_at=TEN)
    make_appointment(db_session, barber=edvaldo, starts_at=TEN + timedelta(hours=2))

    response = reschedule(api, appointment.id, TEN + timedelta(hours=2))

    assert response.status_code == 409
    assert response.json() == UNAVAILABLE
    assert stored(db_session, appointment.id).starts_at == TEN


def test_rn13_rn15_rn21_horarios_da_remarcacao(
    api: TestClient, db_session: Session, edvaldo: int, lauro: int
) -> None:
    """Hoje às 13h50: sem antecedência (RN-21), o próprio agendamento não ocupa
    a agenda, o horário atual não aparece e vale a duração congelada (RN-13)."""
    appointment = make_appointment(
        db_session, barber=edvaldo, starts_at=TWO_PM, duration_minutes=90
    )
    path = f"/admin/appointments/{appointment.id}/availability"

    same = api.get(path, params={"date": "2026-11-02"}).json()
    other = api.get(path, params={"date": "2026-11-02", "barber_id": lauro}).json()
    days = api.get(f"{path}/days").json()

    starts = [slot["starts_at"] for slot in same["slots"]]
    assert same["barber_id"] == edvaldo
    assert "2026-11-02T14:00:00-03:00" not in starts
    assert "2026-11-02T13:30:00-03:00" in starts  # cruza o atual
    assert starts[-1] == "2026-11-02T17:30:00-03:00"  # 90 min até as 19h
    assert other["barber_id"] == lauro
    assert "2026-11-02T14:00:00-03:00" in [s["starts_at"] for s in other["slots"]]
    assert days["days"][0] == "2026-11-02"


# Acesso (RN-70, RN-71).


def test_rn70_so_a_administracao(
    client: TestClient, customer: TestClient, db_session: Session, edvaldo: int
) -> None:
    appointment = make_appointment(db_session, barber=edvaldo, starts_at=TEN)
    calls: list[tuple[str, str, dict[str, Any]]] = [
        ("GET", "/admin/availability", {"params": {"date": "2026-11-03"}}),
        ("GET", "/admin/availability/days", {}),
        ("POST", "/admin/appointments", {"json": {}}),
        ("POST", f"/admin/appointments/{appointment.id}/cancel", {}),
        ("POST", f"/admin/appointments/{appointment.id}/reschedule", {"json": {}}),
        ("GET", f"/admin/appointments/{appointment.id}/availability/days", {}),
    ]
    for method, path, extra in calls:
        assert customer.request(method, path, **extra).status_code == 403, path
        assert client.request(method, path, **extra).status_code == 401, path
    assert stored(db_session, appointment.id).status == AppointmentStatus.SCHEDULED


# Concorrência real (RN-08): cada pedido usa uma sessão própria.


def real_admin(engine: Engine) -> TestClient:
    def session() -> Iterator[Session]:
        with Session(engine) as real:
            yield real

    # O mesmo relógio de `real_client`: segunda às 8h, o horário é de terça.
    return TestClient(admin_app(session, lambda: local(2026, 11, 2, 8)))


def test_rn08_rn21_administracao_e_cliente_no_mesmo_horario_so_um_consegue(
    migrated_engine: Engine,
    people: list[Person],  # noqa: F811
    monkeypatch: MonkeyPatch,
) -> None:
    """A administração agenda para um cliente enquanto outro cliente agenda o
    mesmo horário online. Os dois passam juntos pela conferência e gravam ao
    mesmo tempo: só um consegue, e o outro recebe o mesmo 409."""
    barrier = threading.Barrier(2, timeout=10)

    def checked_then_wait(original: Any) -> Any:
        def wrapper(*args: Any, **kwargs: Any) -> None:
            original(*args, **kwargs)
            barrier.wait()

        return wrapper

    monkeypatch.setattr(
        admin_service,
        "ensure_slot_available",
        checked_then_wait(admin_service.ensure_slot_available),
    )
    monkeypatch.setattr(
        booking_service,
        "ensure_slot_available",
        checked_then_wait(booking_service.ensure_slot_available),
    )
    barber, service = ids(migrated_engine)
    first, second = people

    def by_admin() -> tuple[int, Any]:
        with real_admin(migrated_engine) as client:
            response = create(
                client, barber, service, TEN, customer_id=first.customer_id
            )
            return response.status_code, response.json()

    def online() -> tuple[int, Any]:
        with real_client(migrated_engine, second) as client:
            response = book(client, barber, service, TEN)
            return response.status_code, response.json()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = [pool.submit(by_admin), pool.submit(online)]
        statuses = [future.result() for future in results]

    assert [status for status, _ in statuses] in ([201, 409], [409, 201])
    assert [body for status, body in statuses if status == 409] == [UNAVAILABLE]
    with migrated_engine.connect() as connection:
        scheduled = connection.execute(
            text(
                "SELECT count(*) FROM appointments"
                " WHERE customer_id = ANY(:ids) AND status = 'SCHEDULED'"
            ),
            {"ids": [person.customer_id for person in people]},
        ).scalar_one()
    assert scheduled == 1


def test_rn08_rn20_horario_tomado_na_gravacao_nao_deixa_o_cliente_novo(
    migrated_engine: Engine,
    people: list[Person],  # noqa: F811
    monkeypatch: MonkeyPatch,
) -> None:
    """Depois da conferência, outra reserva grava o mesmo horário. O `commit`
    da administração perde para a exclusion constraint: a resposta é 409 e o
    cliente novo, que ia no mesmo `commit`, não fica gravado."""
    barber, service = ids(migrated_engine)
    other = people[1]
    original = admin_service.ensure_slot_available

    def checked_then_taken(*args: Any, **kwargs: Any) -> None:
        original(*args, **kwargs)
        with migrated_engine.begin() as connection:
            connection.execute(
                text(
                    "INSERT INTO appointments (customer_id, barber_id, service_id,"
                    " starts_at, ends_at, price, duration_minutes, status, source)"
                    " VALUES (:customer, :barber, :service, :starts,"
                    " :starts + interval '45 minutes', 35, 45, 'SCHEDULED', 'ONLINE')"
                ),
                {
                    "customer": other.customer_id,
                    "barber": barber,
                    "service": service,
                    "starts": TEN,
                },
            )

    monkeypatch.setattr(admin_service, "ensure_slot_available", checked_then_taken)
    email = "corrida-balcao@example.com"
    try:
        with real_admin(migrated_engine) as client:
            response = create(
                client,
                barber,
                service,
                TEN,
                customer={**NEW_CUSTOMER, "email": email},
            )

        assert response.status_code == 409
        assert response.json() == UNAVAILABLE
        with migrated_engine.connect() as connection:
            left = connection.execute(
                text("SELECT count(*) FROM customers WHERE email = :email"),
                {"email": email},
            ).scalar_one()
        assert left == 0
    finally:
        with migrated_engine.begin() as connection:
            connection.execute(
                text(
                    "DELETE FROM appointments WHERE customer_id IN"
                    " (SELECT id FROM customers WHERE email = :email)"
                ),
                {"email": email},
            )
            connection.execute(
                text("DELETE FROM customers WHERE email = :email"), {"email": email}
            )
