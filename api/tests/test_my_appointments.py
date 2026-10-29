"""Meus agendamentos: listar, cancelar e remarcar (RN-14 a RN-16, RN-31 a RN-33)."""

import threading
from collections.abc import Iterator
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Any

import pytest
from fastapi.testclient import TestClient
from pytest import MonkeyPatch
from sqlalchemy import Engine, select, text
from sqlalchemy.orm import Session

from app.modules.appointments.models import (
    Appointment,
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
    NOW,
    SUB,
    TEN,
    UNAVAILABLE,
    Person,
    book,
    customer_app,
    ids,
    real_client,
)

NOT_FOUND = {"code": "APPOINTMENT_NOT_FOUND", "message": "Agendamento não encontrado."}
NOT_ACTIVE = {
    "code": "APPOINTMENT_NOT_ACTIVE",
    "message": "Este agendamento não está mais ativo.",
}
DEADLINE = {
    "code": "CHANGE_DEADLINE_PASSED",
    "message": (
        "Faltam menos de 2 horas para o seu horário. "
        "Para cancelar ou remarcar, fale com a barbearia."
    ),
}
SAME_SLOT = {
    "code": "SAME_SLOT",
    "message": "Este já é o horário do seu agendamento. Escolha outro.",
}
WEDNESDAY_TEN = local(2026, 11, 4, 10)


class Clock:
    def __init__(self) -> None:
        self.now = NOW.astimezone(UTC)


@pytest.fixture
def clock() -> Clock:
    return Clock()


@pytest.fixture
def api(db_session: Session, clock: Clock) -> Iterator[TestClient]:
    app = customer_app(lambda: db_session, now=lambda: clock.now)
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
def lauro(db_session: Session) -> int:
    return barber_id(db_session, "Lauro")


@pytest.fixture
def corte_e_barba(db_session: Session) -> int:
    return service_by_name(db_session, "Corte + Barba").id


@pytest.fixture
def booked(api: TestClient, ana: Customer, edvaldo: int, corte_e_barba: int) -> int:
    """Um agendamento da Ana, criado pela API, terça às 10h00 com o Edvaldo."""
    response = book(api, edvaldo, corte_e_barba, TEN)
    assert response.status_code == 201, response.json()
    return response.json()["id"]


def reschedule(
    api: TestClient, appointment_id: int, starts_at: datetime, **extra: Any
) -> Any:
    return api.post(
        f"/me/appointments/{appointment_id}/reschedule",
        json={"starts_at": starts_at.isoformat(), **extra},
    )


def cancel(api: TestClient, appointment_id: int) -> Any:
    return api.post(f"/me/appointments/{appointment_id}/cancel")


def stored(session: Session, appointment_id: int) -> Appointment:
    session.expire_all()
    appointment = session.get(Appointment, appointment_id)
    assert appointment is not None
    return appointment


def public_starts(api: TestClient, barber: int, service: int, day: str) -> list[str]:
    response = api.get(
        "/public/availability",
        params={"barber_id": barber, "service_id": service, "date": day},
    )
    assert response.status_code == 200, response.json()
    return [slot["starts_at"] for slot in response.json()["slots"]]


# Listar (RN-16)


def test_rn16_lista_so_os_proprios_em_proximos_e_historico(
    api: TestClient, db_session: Session, ana: Customer, edvaldo: int
) -> None:
    later = make_appointment(
        db_session, barber=edvaldo, starts_at=WEDNESDAY_TEN, customer=ana
    )
    soon = make_appointment(db_session, barber=edvaldo, starts_at=TEN, customer=ana)
    canceled = make_appointment(
        db_session,
        barber=edvaldo,
        starts_at=local(2026, 11, 3, 14),
        customer=ana,
        status=AppointmentStatus.CANCELED,
    )
    waiting = make_appointment(
        db_session, barber=edvaldo, starts_at=local(2026, 10, 31, 10), customer=ana
    )
    completed = make_appointment(
        db_session,
        barber=edvaldo,
        starts_at=local(2026, 10, 30, 10),
        customer=ana,
        status=AppointmentStatus.COMPLETED,
    )
    make_appointment(db_session, barber=edvaldo, starts_at=local(2026, 11, 3, 15))

    response = api.get("/me/appointments")

    assert response.status_code == 200, response.json()
    body = response.json()
    assert [item["id"] for item in body["upcoming"]] == [soon.id, later.id]
    assert [item["id"] for item in body["history"]] == [
        canceled.id,
        waiting.id,
        completed.id,
    ]
    assert body["upcoming"][0] == {
        "id": soon.id,
        "status": "SCHEDULED",
        "barber": {"id": edvaldo, "name": "Edvaldo"},
        "service": {"id": soon.service_id, "name": "Corte + Barba"},
        "starts_at": "2026-11-03T10:00:00-03:00",
        "ends_at": "2026-11-03T10:45:00-03:00",
        "price": "35.00",
        "duration_minutes": 45,
        "canceled_at": None,
        "canceled_by": None,
        "change_deadline": "2026-11-03T08:00:00-03:00",
        "can_cancel": True,
        "can_reschedule": True,
    }
    history = {item["id"]: item for item in body["history"]}
    assert history[canceled.id]["canceled_by"] == "CUSTOMER"
    assert history[canceled.id]["canceled_at"] == "2026-11-02T14:00:00-03:00"
    for item in body["history"]:
        assert item["change_deadline"] is None or item["status"] == "SCHEDULED"
        assert item["can_cancel"] is False
        assert item["can_reschedule"] is False


def test_rn16_sem_agendamentos_a_lista_vem_vazia(
    api: TestClient, db_session: Session, ana: Customer, edvaldo: int
) -> None:
    make_appointment(db_session, barber=edvaldo, starts_at=TEN)

    response = api.get("/me/appointments")

    assert response.json() == {"upcoming": [], "history": []}


def test_rn11_agendamento_em_andamento_fica_nos_proximos_sem_acoes(
    api: TestClient, db_session: Session, ana: Customer, edvaldo: int
) -> None:
    started = make_appointment(
        db_session, barber=edvaldo, starts_at=NOW - timedelta(minutes=15), customer=ana
    )

    [item] = api.get("/me/appointments").json()["upcoming"]

    assert item["id"] == started.id
    assert item["can_cancel"] is False
    assert item["can_reschedule"] is False


@pytest.mark.parametrize(
    ("before", "allowed"),
    [
        (timedelta(hours=2), True),
        (timedelta(hours=2, minutes=-1), False),
    ],
)
def test_rn14_prazo_de_2_horas_e_inclusivo(
    api: TestClient,
    db_session: Session,
    ana: Customer,
    edvaldo: int,
    before: timedelta,
    allowed: bool,
) -> None:
    appointment = make_appointment(
        db_session, barber=edvaldo, starts_at=NOW + before, customer=ana
    )

    [item] = api.get("/me/appointments").json()["upcoming"]
    assert item["can_cancel"] is allowed
    assert item["can_reschedule"] is allowed

    response = cancel(api, appointment.id)
    assert response.status_code == (200 if allowed else 409), response.json()


def test_rn16_le_um_agendamento_proprio(
    api: TestClient, booked: int, edvaldo: int
) -> None:
    response = api.get(f"/me/appointments/{booked}")

    assert response.status_code == 200, response.json()
    assert response.json()["id"] == booked
    assert response.json()["barber"] == {"id": edvaldo, "name": "Edvaldo"}


# Cancelar (RN-14, RN-31 a RN-33)


def test_rn14_rn31_rn33_cliente_cancela_dentro_do_prazo(
    api: TestClient, db_session: Session, booked: int
) -> None:
    response = cancel(api, booked)

    assert response.status_code == 200, response.json()
    body = response.json()
    assert body["status"] == "CANCELED"
    assert body["canceled_by"] == "CUSTOMER"
    assert body["canceled_at"] == "2026-11-02T08:00:00-03:00"
    assert body["change_deadline"] is None
    assert body["can_cancel"] is False
    appointment = stored(db_session, booked)
    assert appointment.status == AppointmentStatus.CANCELED
    assert appointment.canceled_by == CanceledBy.CUSTOMER
    assert appointment.canceled_at == NOW
    [item] = api.get("/me/appointments").json()["history"]
    assert item["id"] == booked


def test_rn32_vaga_cancelada_volta_na_hora(
    api: TestClient, booked: int, edvaldo: int, corte_e_barba: int
) -> None:
    ten = "2026-11-03T10:00:00-03:00"
    assert ten not in public_starts(api, edvaldo, corte_e_barba, "2026-11-03")

    assert cancel(api, booked).status_code == 200

    assert ten in public_starts(api, edvaldo, corte_e_barba, "2026-11-03")


@pytest.mark.parametrize(
    "before",
    [timedelta(hours=1, minutes=59), timedelta(0), timedelta(minutes=-30)],
    ids=["1h59 antes", "no início", "em andamento"],
)
def test_rn14_cancelar_fora_do_prazo_e_recusado(
    api: TestClient,
    db_session: Session,
    ana: Customer,
    edvaldo: int,
    before: timedelta,
) -> None:
    appointment = make_appointment(
        db_session, barber=edvaldo, starts_at=NOW + before, customer=ana
    )

    response = cancel(api, appointment.id)

    assert response.status_code == 409
    assert response.json() == DEADLINE
    assert stored(db_session, appointment.id).status == AppointmentStatus.SCHEDULED


def test_rn14_o_prazo_conta_do_relogio_da_requisicao(
    api: TestClient, db_session: Session, clock: Clock, booked: int
) -> None:
    clock.now = (TEN - timedelta(hours=1, minutes=30)).astimezone(UTC)

    assert cancel(api, booked).json() == DEADLINE
    assert reschedule(api, booked, local(2026, 11, 3, 15)).json() == DEADLINE
    assert stored(db_session, booked).starts_at == TEN


@pytest.mark.parametrize(
    "status",
    [
        AppointmentStatus.CANCELED,
        AppointmentStatus.COMPLETED,
        AppointmentStatus.NO_SHOW,
    ],
)
def test_rn31_status_final_nao_cancela_nem_remarca(
    api: TestClient,
    db_session: Session,
    ana: Customer,
    edvaldo: int,
    status: AppointmentStatus,
) -> None:
    appointment = make_appointment(
        db_session, barber=edvaldo, starts_at=TEN, customer=ana, status=status
    )

    canceled = cancel(api, appointment.id)
    rescheduled = reschedule(api, appointment.id, WEDNESDAY_TEN)
    days = api.get(f"/me/appointments/{appointment.id}/availability/days")

    for response in (canceled, rescheduled, days):
        assert response.status_code == 409
        assert response.json() == NOT_ACTIVE
    assert stored(db_session, appointment.id).status == status


# Privacidade (RN-16)


@pytest.mark.parametrize("owner", ["outro cliente", "inexistente"])
def test_rn16_cliente_nao_acessa_agendamento_de_outro(
    api: TestClient,
    db_session: Session,
    ana: Customer,
    edvaldo: int,
    owner: str,
) -> None:
    other = make_appointment(
        db_session, barber=edvaldo, starts_at=TEN, customer=make_customer(db_session)
    )
    target = other.id if owner == "outro cliente" else 999999

    responses = [
        api.get(f"/me/appointments/{target}"),
        cancel(api, target),
        reschedule(api, target, WEDNESDAY_TEN),
        api.get(f"/me/appointments/{target}/availability/days"),
        api.get(
            f"/me/appointments/{target}/availability", params={"date": "2026-11-04"}
        ),
    ]

    for response in responses:
        assert response.status_code == 404
        assert response.json() == NOT_FOUND
    appointment = stored(db_session, other.id)
    assert appointment.status == AppointmentStatus.SCHEDULED
    assert appointment.starts_at == TEN


def test_rn70_sem_login_nao_ve_agendamentos(client: TestClient) -> None:
    assert client.get("/me/appointments").status_code == 401
    assert client.post("/me/appointments/1/cancel").status_code == 401


def test_rn70_rn71_administracao_nao_tem_agendamentos_de_cliente(
    admin: TestClient,
) -> None:
    response = admin.get("/me/appointments")

    assert response.status_code == 403


# Remarcar (RN-14, RN-15, RN-05 a RN-08)


def test_rn15_rn31_cliente_remarca_dentro_do_prazo(
    api: TestClient, db_session: Session, booked: int, edvaldo: int
) -> None:
    response = reschedule(api, booked, WEDNESDAY_TEN)

    assert response.status_code == 200, response.json()
    body = response.json()
    assert body["id"] == booked
    assert body["status"] == "SCHEDULED"
    assert body["barber"] == {"id": edvaldo, "name": "Edvaldo"}
    assert body["service"]["name"] == "Corte + Barba"
    assert body["starts_at"] == "2026-11-04T10:00:00-03:00"
    assert body["ends_at"] == "2026-11-04T10:45:00-03:00"
    assert body["change_deadline"] == "2026-11-04T08:00:00-03:00"
    appointment = stored(db_session, booked)
    assert appointment.starts_at == WEDNESDAY_TEN
    assert (
        db_session.scalar(select(Appointment.id).where(Appointment.id != booked))
        is None
    )


def test_rn15_rn32_remarcar_libera_o_horario_antigo(
    api: TestClient, booked: int, edvaldo: int, corte_e_barba: int
) -> None:
    assert reschedule(api, booked, WEDNESDAY_TEN).status_code == 200

    starts = public_starts(api, edvaldo, corte_e_barba, "2026-11-03")
    assert "2026-11-03T10:00:00-03:00" in starts
    starts = public_starts(api, edvaldo, corte_e_barba, "2026-11-04")
    assert "2026-11-04T10:00:00-03:00" not in starts


def test_rn15_remarca_com_outro_barbeiro(
    api: TestClient, db_session: Session, booked: int, lauro: int
) -> None:
    response = reschedule(api, booked, TEN, barber_id=lauro)

    assert response.status_code == 200, response.json()
    assert response.json()["barber"] == {"id": lauro, "name": "Lauro"}
    assert stored(db_session, booked).barber_id == lauro


def test_rn15_remarcar_para_horario_que_cruza_o_atual(
    api: TestClient, db_session: Session, booked: int
) -> None:
    """10h00–10h45 → 10h30–11h15 com o mesmo barbeiro: o próprio agendamento
    não ocupa a agenda, e a mesma linha muda sem violar a RN-08."""
    response = reschedule(api, booked, local(2026, 11, 3, 10, 30))

    assert response.status_code == 200, response.json()
    assert response.json()["ends_at"] == "2026-11-03T11:15:00-03:00"
    assert stored(db_session, booked).starts_at == local(2026, 11, 3, 10, 30)


def test_rn15_rn13_preco_e_duracao_congelados_na_remarcacao(
    api: TestClient,
    admin: TestClient,
    db_session: Session,
    booked: int,
    corte_e_barba: int,
) -> None:
    changed = admin.patch(
        f"/admin/services/{corte_e_barba}",
        json={"price": "50.00", "duration_minutes": 60},
    )
    assert changed.status_code == 200, changed.json()

    response = reschedule(api, booked, WEDNESDAY_TEN)

    assert response.status_code == 200, response.json()
    assert response.json()["price"] == "35.00"
    assert response.json()["duration_minutes"] == 45
    assert response.json()["ends_at"] == "2026-11-04T10:45:00-03:00"
    appointment = stored(db_session, booked)
    assert appointment.price == Decimal("35.00")
    assert appointment.duration_minutes == 45


def test_rn15_mesmo_horario_e_recusado(
    api: TestClient, booked: int, edvaldo: int
) -> None:
    assert reschedule(api, booked, TEN).json() == SAME_SLOT
    response = reschedule(api, booked, TEN.astimezone(UTC), barber_id=edvaldo)
    assert response.status_code == 409
    assert response.json() == SAME_SLOT


@pytest.mark.parametrize(
    "payload",
    [
        {"service_id": 1},  # RN-15: o serviço não muda
        {"customer_id": 1},
        {"starts_at": "2026-11-04T10:00:00"},  # sem fuso (RN-01)
    ],
)
def test_rn15_corpo_nao_troca_o_servico(
    api: TestClient, db_session: Session, booked: int, payload: dict[str, object]
) -> None:
    body: dict[str, object] = {"starts_at": WEDNESDAY_TEN.isoformat(), **payload}

    response = api.post(f"/me/appointments/{booked}/reschedule", json=body)

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"
    assert stored(db_session, booked).starts_at == TEN


@pytest.mark.parametrize(
    "starts_at",
    [
        local(2026, 11, 4, 10, 15),  # fora da grade (RN-04)
        local(2026, 11, 2, 8, 30),  # menos de 1 hora (RN-06)
        local(2026, 12, 3, 10),  # além da janela (RN-07)
        local(2026, 11, 8, 10),  # domingo, fechado (RN-02)
        local(2026, 11, 4, 10, 30),  # ocupado por outro cliente (RN-08)
    ],
)
def test_rn05_rn15_novo_horario_indisponivel_e_recusado(
    api: TestClient,
    db_session: Session,
    booked: int,
    edvaldo: int,
    starts_at: datetime,
) -> None:
    make_appointment(db_session, barber=edvaldo, starts_at=WEDNESDAY_TEN)

    response = reschedule(api, booked, starts_at)

    assert response.status_code == 409
    assert response.json() == UNAVAILABLE
    assert stored(db_session, booked).starts_at == TEN


@pytest.mark.parametrize("change", ["barbeiro inativo", "não faz", "serviço inativo"])
def test_rn05_item5_rn15_novo_barbeiro_precisa_realizar_o_servico(
    api: TestClient,
    db_session: Session,
    booked: int,
    lauro: int,
    change: str,
) -> None:
    service = service_by_name(db_session, "Corte + Barba")
    barber = db_session.get(Barber, lauro)
    assert barber is not None
    if change == "barbeiro inativo":
        barber.active = False
    elif change == "não faz":
        service.barbers = [b for b in service.barbers if b.id != lauro]
    else:
        service.active = False
    db_session.flush()

    response = reschedule(api, booked, WEDNESDAY_TEN, barber_id=lauro)

    assert response.status_code == 409
    assert response.json() == UNAVAILABLE
    assert stored(db_session, booked).barber_id != lauro


def test_rn15_barbeiro_inexistente(api: TestClient, booked: int) -> None:
    response = reschedule(api, booked, WEDNESDAY_TEN, barber_id=999999)

    assert response.status_code == 404
    assert response.json()["code"] == "BARBER_NOT_FOUND"


@pytest.mark.parametrize(
    "before", [timedelta(hours=1, minutes=59), timedelta(minutes=-10)]
)
def test_rn14_remarcar_fora_do_prazo_e_recusado(
    api: TestClient,
    db_session: Session,
    ana: Customer,
    edvaldo: int,
    before: timedelta,
) -> None:
    appointment = make_appointment(
        db_session, barber=edvaldo, starts_at=NOW + before, customer=ana
    )

    response = reschedule(api, appointment.id, WEDNESDAY_TEN)
    days = api.get(f"/me/appointments/{appointment.id}/availability/days")

    assert response.status_code == 409
    assert response.json() == DEADLINE
    assert days.status_code == 409
    assert days.json() == DEADLINE
    assert stored(db_session, appointment.id).starts_at == NOW + before


# Horários da remarcação


def test_rn15_horarios_da_remarcacao_ignoram_o_proprio_agendamento(
    api: TestClient, booked: int, edvaldo: int, corte_e_barba: int
) -> None:
    response = api.get(
        f"/me/appointments/{booked}/availability", params={"date": "2026-11-03"}
    )

    assert response.status_code == 200, response.json()
    body = response.json()
    assert body["barber_id"] == edvaldo
    assert body["service_id"] == corte_e_barba
    assert body["date"] == "2026-11-03"
    starts = [slot["starts_at"] for slot in body["slots"]]
    # O horário atual não é oferecido de novo; o que cruza com ele, sim.
    assert "2026-11-03T10:00:00-03:00" not in starts
    assert "2026-11-03T10:30:00-03:00" in starts
    assert body["slots"][0]["ends_at"] == "2026-11-03T11:15:00-03:00"
    public = public_starts(api, edvaldo, corte_e_barba, "2026-11-03")
    assert "2026-11-03T10:30:00-03:00" not in public


def test_rn15_horarios_com_outro_barbeiro_incluem_o_horario_atual(
    api: TestClient, booked: int, lauro: int
) -> None:
    response = api.get(
        f"/me/appointments/{booked}/availability",
        params={"date": "2026-11-03", "barber_id": lauro},
    )

    assert response.json()["barber_id"] == lauro
    starts = [slot["starts_at"] for slot in response.json()["slots"]]
    assert "2026-11-03T10:00:00-03:00" in starts


def test_rn13_rn15_horarios_da_remarcacao_usam_a_duracao_congelada(
    api: TestClient, admin: TestClient, booked: int, corte_e_barba: int
) -> None:
    admin.patch(f"/admin/services/{corte_e_barba}", json={"duration_minutes": 60})

    response = api.get(
        f"/me/appointments/{booked}/availability", params={"date": "2026-11-04"}
    )

    first = response.json()["slots"][0]
    assert first["starts_at"] == "2026-11-04T10:00:00-03:00"
    assert first["ends_at"] == "2026-11-04T10:45:00-03:00"


def test_rn07_rn15_dias_da_remarcacao(
    api: TestClient, db_session: Session, booked: int, edvaldo: int
) -> None:
    response = api.get(f"/me/appointments/{booked}/availability/days")

    assert response.status_code == 200, response.json()
    days = response.json()["days"]
    assert response.json()["barber_id"] == edvaldo
    assert days[0] == "2026-11-02"
    assert "2026-11-03" in days
    assert "2026-11-08" not in days  # domingo
    assert days[-1] == "2026-12-02"


def test_rn15_dia_so_com_o_horario_atual_nao_aparece(
    api: TestClient, db_session: Session, ana: Customer, edvaldo: int
) -> None:
    """Sábado das 9h às 14h: com o resto do dia ocupado, o único início livre
    é o do próprio agendamento, que não é oferecido de novo."""
    saturday = local(2026, 11, 7, 9)
    mine = make_appointment(
        db_session,
        barber=edvaldo,
        starts_at=saturday,
        customer=ana,
        duration_minutes=60,
    )
    make_appointment(
        db_session,
        barber=edvaldo,
        starts_at=local(2026, 11, 7, 10),
        duration_minutes=240,
    )

    days = api.get(f"/me/appointments/{mine.id}/availability/days").json()["days"]

    assert "2026-11-07" not in days


# Concorrência real (RN-08): cada pedido usa uma sessão própria.


@pytest.fixture
def pair(migrated_engine: Engine) -> Iterator[list[Person]]:
    created: list[Person] = []
    with migrated_engine.begin() as connection:
        for index in (1, 2):
            sub = f"remarcacao-{index}"
            email = f"remarcacao{index}@example.com"
            customer_id = connection.execute(
                text(
                    "INSERT INTO customers (name, phone, email, auth_user_id)"
                    " VALUES ('Remarcação', '75900000000', :email, :sub)"
                    " RETURNING id"
                ),
                {"email": email, "sub": sub},
            ).scalar_one()
            created.append(Person(sub=sub, email=email, customer_id=customer_id))
    try:
        yield created
    finally:
        customer_ids = [person.customer_id for person in created]
        with migrated_engine.begin() as connection:
            connection.execute(
                text("DELETE FROM appointments WHERE customer_id = ANY(:ids)"),
                {"ids": customer_ids},
            )
            connection.execute(
                text("DELETE FROM customers WHERE id = ANY(:ids)"),
                {"ids": customer_ids},
            )


def test_rn08_rn15_remarcacao_e_reserva_simultaneas_so_uma_consegue(
    migrated_engine: Engine, pair: list[Person], monkeypatch: MonkeyPatch
) -> None:
    """Um cliente remarca para quarta às 10h00 enquanto outro agenda o mesmo
    horário. Os dois passam juntos pela conferência (o `Barrier` segura cada um
    logo depois dela) e gravam ao mesmo tempo: só um consegue, e o outro recebe
    o 409 "horário não está mais disponível"."""
    barber, service = ids(migrated_engine)
    first, second = pair
    with real_client(migrated_engine, first) as client:
        created = book(client, barber, service, TEN)
        assert created.status_code == 201, created.json()
        appointment_id = created.json()["id"]

    barrier = threading.Barrier(2, timeout=10)
    original = booking_service.ensure_slot_available

    def checked_then_wait(*args: Any, **kwargs: Any) -> None:
        original(*args, **kwargs)
        barrier.wait()

    monkeypatch.setattr(booking_service, "ensure_slot_available", checked_then_wait)

    def move() -> tuple[int, Any]:
        with real_client(migrated_engine, first) as client:
            response = reschedule(client, appointment_id, WEDNESDAY_TEN)
            return response.status_code, response.json()

    def take() -> tuple[int, Any]:
        with real_client(migrated_engine, second) as client:
            response = book(client, barber, service, WEDNESDAY_TEN)
            return response.status_code, response.json()

    with ThreadPoolExecutor(max_workers=2) as pool:
        moved, taken = pool.submit(move), pool.submit(take)
        results = [moved.result(), taken.result()]

    # Remarcação 200 e reserva 409, ou remarcação 409 e reserva 201.
    assert [status for status, _ in results] in ([200, 409], [409, 201])
    assert [body for status, body in results if status == 409] == [UNAVAILABLE]
    with migrated_engine.connect() as connection:
        rows = connection.execute(
            text(
                "SELECT customer_id, starts_at FROM appointments"
                " WHERE customer_id = ANY(:ids) AND status = 'SCHEDULED'"
                " ORDER BY customer_id"
            ),
            {"ids": [person.customer_id for person in pair]},
        ).all()
    wednesday = [row for row in rows if row.starts_at == WEDNESDAY_TEN]
    assert len(wednesday) == 1
    if results[0][0] == 409:
        # A remarcação perdeu: o agendamento continua no horário antigo.
        assert (first.customer_id, TEN) in [tuple(row) for row in rows]
