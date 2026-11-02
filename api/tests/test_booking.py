"""Agendamento pelo cliente: `POST /me/appointments` (RN-05 a RN-13, RN-16, RN-70)."""

import threading
from collections.abc import Callable, Iterator
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pytest import MonkeyPatch
from sqlalchemy import Engine, select, text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

from app.auth.dependencies import current_user
from app.auth.schemas import CurrentUser
from app.clock import utc_now
from app.db import get_session
from app.main import create_app
from app.modules.appointments.models import (
    Appointment,
    AppointmentSource,
    AppointmentStatus,
)
from app.modules.barbers.models import Barber
from app.modules.booking import service as booking_service
from app.modules.customers.models import Customer
from tests.factories import barber_id, local, make_appointment, service_by_name

# Segunda-feira, 2/11/2026, 8h em São Paulo. Os horários pedidos são da terça.
NOW = local(2026, 11, 2, 8)
TEN = local(2026, 11, 3, 10)
SUB = "cliente-agenda"

UNAVAILABLE = {
    "code": "SLOT_UNAVAILABLE",
    "message": "Este horário não está mais disponível. Escolha outro.",
}
LIMIT = {
    "code": "APPOINTMENT_LIMIT_REACHED",
    "message": (
        "Você já tem 2 agendamentos marcados, que é o máximo. Para marcar outro, "
        "cancele um deles ou espere o próximo atendimento."
    ),
}


class Clock:
    def __init__(self) -> None:
        self.now = NOW.astimezone(UTC)


@pytest.fixture
def clock() -> Clock:
    return Clock()


def customer_app(
    get_session_override: Callable[[], Any],
    *,
    sub: str = SUB,
    email: str = "ana@example.com",
    now: Callable[[], datetime],
) -> FastAPI:
    app = create_app()
    app.dependency_overrides[get_session] = get_session_override
    app.dependency_overrides[utc_now] = now
    app.dependency_overrides[current_user] = lambda: CurrentUser(
        sub=sub, email=email, name="Ana", role="customer"
    )
    return app


@pytest.fixture
def api(db_session: Session, clock: Clock) -> Iterator[TestClient]:
    """Cliente logado, ainda sem cadastro (a API o cria no primeiro acesso)."""
    app = customer_app(lambda: db_session, now=lambda: clock.now)
    with TestClient(app) as client:
        yield client


@pytest.fixture
def ana(api: TestClient, db_session: Session) -> Customer:
    """O cliente do `api`, já com telefone."""
    response = api.patch("/me/profile", json={"phone": "(11) 98765-4321"})
    assert response.status_code == 200, response.json()
    found = db_session.scalar(select(Customer).where(Customer.auth_user_id == SUB))
    assert found is not None
    return found


@pytest.fixture
def edvaldo(db_session: Session) -> int:
    return barber_id(db_session, "Edvaldo")


@pytest.fixture
def corte_e_barba(db_session: Session) -> int:
    return service_by_name(db_session, "Corte + Barba").id


def book(
    api: TestClient, barber: int, service: int, starts_at: datetime | str = TEN
) -> Any:
    value = starts_at if isinstance(starts_at, str) else starts_at.isoformat()
    return api.post(
        "/me/appointments",
        json={"barber_id": barber, "service_id": service, "starts_at": value},
    )


def appointments_of(session: Session, customer: Customer) -> list[Appointment]:
    return list(
        session.scalars(
            select(Appointment).where(Appointment.customer_id == customer.id)
        ).all()
    )


def test_rn12_rn13_cliente_agenda_um_horario_disponivel(
    api: TestClient,
    db_session: Session,
    ana: Customer,
    edvaldo: int,
    corte_e_barba: int,
) -> None:
    response = book(api, edvaldo, corte_e_barba)

    assert response.status_code == 201, response.json()
    body = response.json()
    assert body == {
        "id": body["id"],
        "status": "SCHEDULED",
        "barber": {"id": edvaldo, "name": "Edvaldo"},
        "service": {"id": corte_e_barba, "name": "Corte + Barba"},
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
    [appointment] = appointments_of(db_session, ana)
    assert appointment.id == body["id"]
    assert appointment.status == AppointmentStatus.SCHEDULED
    assert appointment.source == AppointmentSource.ONLINE
    assert appointment.price == Decimal("35.00")
    assert appointment.duration_minutes == 45
    assert appointment.starts_at == TEN


def test_rn01_aceita_o_mesmo_instante_em_utc(
    api: TestClient, ana: Customer, edvaldo: int, corte_e_barba: int
) -> None:
    response = book(api, edvaldo, corte_e_barba, "2026-11-03T13:00:00Z")

    assert response.status_code == 201, response.json()
    assert response.json()["starts_at"] == "2026-11-03T10:00:00-03:00"


def test_rn13_preco_e_duracao_sao_os_do_servico_no_momento_da_criacao(
    api: TestClient,
    admin: TestClient,
    db_session: Session,
    ana: Customer,
    edvaldo: int,
    corte_e_barba: int,
) -> None:
    changed = admin.patch(
        f"/admin/services/{corte_e_barba}",
        json={"price": "40.00", "duration_minutes": 60},
    )
    assert changed.status_code == 200, changed.json()

    body = book(api, edvaldo, corte_e_barba).json()
    assert body["price"] == "40.00"
    assert body["ends_at"] == "2026-11-03T11:00:00-03:00"

    admin.patch(
        f"/admin/services/{corte_e_barba}",
        json={"price": "50.00", "duration_minutes": 30},
    )
    [appointment] = appointments_of(db_session, ana)
    db_session.refresh(appointment)
    assert appointment.price == Decimal("40.00")
    assert appointment.duration_minutes == 60
    assert appointment.ends_at == local(2026, 11, 3, 11)


def test_rn10_sem_telefone_o_cliente_nao_agenda(
    api: TestClient, db_session: Session, edvaldo: int, corte_e_barba: int
) -> None:
    response = book(api, edvaldo, corte_e_barba)

    assert response.status_code == 409
    assert response.json() == {
        "code": "PHONE_REQUIRED",
        "message": (
            "Informe seu telefone para agendar. "
            "A barbearia usa o telefone para falar com você."
        ),
    }
    assert db_session.scalar(select(Appointment.id)) is None


def test_rn10_depois_de_informar_o_telefone_o_cliente_agenda(
    api: TestClient, edvaldo: int, corte_e_barba: int
) -> None:
    assert book(api, edvaldo, corte_e_barba).status_code == 409

    api.patch("/me/profile", json={"phone": "11987654321"})

    assert book(api, edvaldo, corte_e_barba).status_code == 201


def test_rn11_terceiro_agendamento_ativo_e_recusado(
    api: TestClient,
    db_session: Session,
    ana: Customer,
    edvaldo: int,
    corte_e_barba: int,
) -> None:
    assert book(api, edvaldo, corte_e_barba, TEN).status_code == 201
    assert book(api, edvaldo, corte_e_barba, local(2026, 11, 4, 10)).status_code == 201

    response = book(api, edvaldo, corte_e_barba, local(2026, 11, 5, 10))

    assert response.status_code == 409
    assert response.json() == LIMIT
    assert len(appointments_of(db_session, ana)) == 2


@pytest.mark.parametrize(
    "status",
    [
        AppointmentStatus.CANCELED,
        AppointmentStatus.COMPLETED,
        AppointmentStatus.NO_SHOW,
    ],
)
def test_rn11_agendamento_que_nao_esta_ativo_nao_conta(
    api: TestClient,
    db_session: Session,
    ana: Customer,
    edvaldo: int,
    corte_e_barba: int,
    status: AppointmentStatus,
) -> None:
    lauro = barber_id(db_session, "Lauro")
    for day in (4, 5):
        make_appointment(
            db_session,
            barber=lauro,
            starts_at=local(2026, 11, day, 10),
            status=status,
            customer=ana,
        )

    assert book(api, edvaldo, corte_e_barba, TEN).status_code == 201
    assert book(api, edvaldo, corte_e_barba, local(2026, 11, 4, 10)).status_code == 201


def test_rn11_agendamento_que_ja_terminou_nao_conta(
    api: TestClient,
    db_session: Session,
    ana: Customer,
    edvaldo: int,
    corte_e_barba: int,
) -> None:
    # Dois `SCHEDULED` de ontem que ainda esperam a conclusão.
    lauro = barber_id(db_session, "Lauro")
    for hour in (10, 14):
        make_appointment(
            db_session,
            barber=lauro,
            starts_at=local(2026, 11, 1, hour),
            customer=ana,
        )

    assert book(api, edvaldo, corte_e_barba, TEN).status_code == 201
    assert book(api, edvaldo, corte_e_barba, local(2026, 11, 4, 10)).status_code == 201


def test_rn11_agendamento_em_andamento_conta(
    api: TestClient,
    db_session: Session,
    clock: Clock,
    ana: Customer,
    edvaldo: int,
    corte_e_barba: int,
) -> None:
    clock.now = local(2026, 11, 2, 10, 15).astimezone(UTC)
    make_appointment(
        db_session,
        barber=barber_id(db_session, "Lauro"),
        starts_at=local(2026, 11, 2, 10),
        customer=ana,
    )
    assert book(api, edvaldo, corte_e_barba, TEN).status_code == 201

    response = book(api, edvaldo, corte_e_barba, local(2026, 11, 4, 10))

    assert response.status_code == 409
    assert response.json() == LIMIT


def test_rn11_rn16_agendamentos_de_outro_cliente_nao_contam(
    api: TestClient,
    db_session: Session,
    ana: Customer,
    edvaldo: int,
    corte_e_barba: int,
) -> None:
    lauro = barber_id(db_session, "Lauro")
    for day in (4, 5):
        make_appointment(db_session, barber=lauro, starts_at=local(2026, 11, day, 10))

    assert book(api, edvaldo, corte_e_barba, TEN).status_code == 201
    assert book(api, edvaldo, corte_e_barba, local(2026, 11, 6, 10)).status_code == 201


def test_rn08_horario_ja_ocupado_e_recusado(
    api: TestClient,
    db_session: Session,
    ana: Customer,
    edvaldo: int,
    corte_e_barba: int,
) -> None:
    make_appointment(db_session, barber=edvaldo, starts_at=TEN)

    response = book(api, edvaldo, corte_e_barba, local(2026, 11, 3, 10, 30))

    assert response.status_code == 409
    assert response.json() == UNAVAILABLE
    assert appointments_of(db_session, ana) == []


@pytest.mark.parametrize(
    ("starts_at", "now"),
    [
        (local(2026, 11, 3, 10, 15), NOW),  # fora da grade (RN-04)
        (local(2026, 11, 3, 18, 30), NOW),  # passa do fechamento (RN-02)
        (local(2026, 11, 8, 10), NOW),  # domingo fechado (RN-02)
        (local(2026, 11, 2, 10), local(2026, 11, 2, 9, 30)),  # menos de 1h (RN-06)
        (local(2026, 11, 2, 10), local(2026, 11, 2, 11)),  # já passou (RN-06)
        (local(2026, 12, 3, 10), NOW),  # além de 30 dias (RN-07)
    ],
)
def test_rn05_rn06_rn07_horario_fora_das_regras_e_recusado(
    api: TestClient,
    clock: Clock,
    ana: Customer,
    edvaldo: int,
    corte_e_barba: int,
    starts_at: datetime,
    now: datetime,
) -> None:
    clock.now = now.astimezone(UTC)

    response = book(api, edvaldo, corte_e_barba, starts_at)

    assert response.status_code == 409
    assert response.json() == UNAVAILABLE


def test_rn07_ultimo_dia_da_janela_e_aceito(
    api: TestClient, ana: Customer, edvaldo: int, corte_e_barba: int
) -> None:
    response = book(api, edvaldo, corte_e_barba, local(2026, 12, 2, 18))

    assert response.status_code == 201, response.json()


@pytest.mark.parametrize("change", ["barbeiro inativo", "serviço inativo", "não faz"])
def test_rn05_item5_sem_oferta_o_horario_e_recusado(
    api: TestClient,
    db_session: Session,
    ana: Customer,
    edvaldo: int,
    corte_e_barba: int,
    change: str,
) -> None:
    service = service_by_name(db_session, "Corte + Barba")
    barber = db_session.get(Barber, edvaldo)
    assert barber is not None
    if change == "barbeiro inativo":
        barber.active = False
    elif change == "serviço inativo":
        service.active = False
    else:
        service.barbers = [b for b in service.barbers if b.id != edvaldo]
    db_session.flush()

    response = book(api, edvaldo, corte_e_barba)

    assert response.status_code == 409
    assert response.json() == UNAVAILABLE


@pytest.mark.parametrize(
    ("field", "code"),
    [("barber_id", "BARBER_NOT_FOUND"), ("service_id", "SERVICE_NOT_FOUND")],
)
def test_barbeiro_ou_servico_inexistente(
    api: TestClient,
    ana: Customer,
    edvaldo: int,
    corte_e_barba: int,
    field: str,
    code: str,
) -> None:
    payload: dict[str, object] = {
        "barber_id": edvaldo,
        "service_id": corte_e_barba,
        "starts_at": TEN.isoformat(),
    }
    payload[field] = 999999

    response = api.post("/me/appointments", json=payload)

    assert response.status_code == 404
    assert response.json()["code"] == code


@pytest.mark.parametrize(
    "changes",
    [
        {"starts_at": "2026-11-03T10:00:00"},  # sem fuso (RN-01)
        {"starts_at": "amanhã"},
        {"barber_id": None},
        {"customer_id": 1},  # o cliente vem do token (RN-16)
        {"status": "COMPLETED"},
    ],
)
def test_corpo_invalido(
    api: TestClient,
    ana: Customer,
    edvaldo: int,
    corte_e_barba: int,
    changes: dict[str, object],
) -> None:
    payload: dict[str, object] = {
        "barber_id": edvaldo,
        "service_id": corte_e_barba,
        "starts_at": TEN.isoformat(),
    } | changes

    response = api.post("/me/appointments", json=payload)

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"


def test_rn70_sem_login_nao_agenda(
    client: TestClient, edvaldo: int, corte_e_barba: int
) -> None:
    response = book(client, edvaldo, corte_e_barba)

    assert response.status_code == 401


def test_rn70_rn71_administracao_nao_agenda_para_si(
    admin: TestClient, db_session: Session, edvaldo: int, corte_e_barba: int
) -> None:
    response = book(admin, edvaldo, corte_e_barba)

    assert response.status_code == 403
    assert db_session.scalar(select(Customer.id)) is None


# Concorrência real: cada pedido usa uma sessão própria, que confirma de verdade.


@dataclass(frozen=True)
class Person:
    sub: str
    email: str
    customer_id: int


@pytest.fixture
def people(migrated_engine: Engine) -> Iterator[list[Person]]:
    """Dois clientes confirmados de verdade, com telefone. Tudo o que os testes
    gravam para eles é apagado no fim, mesmo se o teste falhar."""
    created: list[Person] = []
    with migrated_engine.begin() as connection:
        for index in (1, 2):
            sub = f"concorrencia-{index}"
            email = f"concorrencia{index}@example.com"
            customer_id = connection.execute(
                text(
                    "INSERT INTO customers (name, phone, email, auth_user_id)"
                    " VALUES ('Concorrência', '75900000000', :email, :sub)"
                    " RETURNING id"
                ),
                {"email": email, "sub": sub},
            ).scalar_one()
            created.append(Person(sub=sub, email=email, customer_id=customer_id))
    try:
        yield created
    finally:
        ids = [person.customer_id for person in created]
        with migrated_engine.begin() as connection:
            connection.execute(
                text(
                    "DELETE FROM notifications WHERE appointment_id IN"
                    " (SELECT id FROM appointments WHERE customer_id = ANY(:ids))"
                ),
                {"ids": ids},
            )
            connection.execute(
                text("DELETE FROM appointments WHERE customer_id = ANY(:ids)"),
                {"ids": ids},
            )
            connection.execute(
                text("DELETE FROM customers WHERE id = ANY(:ids)"), {"ids": ids}
            )


def real_client(engine: Engine, person: Person) -> TestClient:
    def session() -> Iterator[Session]:
        with Session(engine) as real:
            yield real

    app = customer_app(session, sub=person.sub, email=person.email, now=lambda: NOW)
    return TestClient(app)


def count_scheduled(engine: Engine, people: list[Person]) -> int:
    with engine.connect() as connection:
        return connection.execute(
            text(
                "SELECT count(*) FROM appointments"
                " WHERE customer_id = ANY(:ids) AND status = 'SCHEDULED'"
            ),
            {"ids": [person.customer_id for person in people]},
        ).scalar_one()


def count_notifications(engine: Engine, people: list[Person]) -> dict[str, int]:
    with engine.connect() as connection:
        rows = connection.execute(
            text(
                "SELECT n.status, count(*) FROM notifications n"
                " JOIN appointments a ON a.id = n.appointment_id"
                " WHERE a.customer_id = ANY(:ids) GROUP BY n.status"
            ),
            {"ids": [person.customer_id for person in people]},
        ).all()
    return {status: count for status, count in rows}


def ids(migrated_engine: Engine) -> tuple[int, int]:
    with migrated_engine.connect() as connection:
        barber = connection.execute(
            select(Barber.id).where(Barber.name == "Edvaldo")
        ).scalar_one()
        service = connection.execute(
            text("SELECT id FROM services WHERE name = 'Corte + Barba'")
        ).scalar_one()
    return barber, service


def test_rn08_dois_clientes_no_mesmo_horario_so_um_consegue(
    migrated_engine: Engine, people: list[Person], monkeypatch: MonkeyPatch
) -> None:
    """Os dois pedidos passam juntos pela conferência de disponibilidade (o
    `Barrier` segura cada um logo depois dela) e gravam ao mesmo tempo. O banco
    recusa um deles, pela exclusion constraint ou por deadlock, e a API responde
    o mesmo 409 "horário não está mais disponível"."""
    barrier = threading.Barrier(2, timeout=10)
    original = booking_service.ensure_slot_available

    def checked_then_wait(*args: Any, **kwargs: Any) -> None:
        original(*args, **kwargs)
        barrier.wait()

    monkeypatch.setattr(booking_service, "ensure_slot_available", checked_then_wait)
    barber, service = ids(migrated_engine)

    def attempt(person: Person) -> tuple[int, Any]:
        with real_client(migrated_engine, person) as client:
            response = book(client, barber, service, TEN)
            return response.status_code, response.json()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(attempt, people))

    assert sorted(status for status, _ in results) == [201, 409]
    assert [body for status, body in results if status == 409] == [UNAVAILABLE]
    assert count_scheduled(migrated_engine, people) == 1
    # RN-50: só a reserva gravada gera confirmação; a recusada não deixa registro.
    assert count_notifications(migrated_engine, people) == {"SENT": 1}


def test_rn11_dois_pedidos_simultaneos_do_mesmo_cliente_nao_passam_do_limite(
    migrated_engine: Engine, people: list[Person], monkeypatch: MonkeyPatch
) -> None:
    """Com 1 agendamento ativo, o cliente pede outros 2 ao mesmo tempo, em
    horários diferentes. A trava do cliente faz um pedido contar depois do
    outro: só um passa, e o outro recebe o limite da RN-11."""
    person = people[0]
    barber, service = ids(migrated_engine)
    with real_client(migrated_engine, person) as client:
        assert book(client, barber, service, TEN).status_code == 201

    barrier = threading.Barrier(2, timeout=10)
    original = booking_service._lock_customer  # pyright: ignore[reportPrivateUsage]

    def wait_then_lock(session: Session, customer_id: int) -> Customer:
        barrier.wait()
        return original(session, customer_id)

    monkeypatch.setattr(booking_service, "_lock_customer", wait_then_lock)

    def attempt(starts_at: datetime) -> tuple[int, Any]:
        with real_client(migrated_engine, person) as client:
            response = book(client, barber, service, starts_at)
            return response.status_code, response.json()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(
            pool.map(attempt, [local(2026, 11, 4, 10), local(2026, 11, 5, 10)])
        )

    assert sorted(status for status, _ in results) == [201, 409]
    assert [body for status, body in results if status == 409] == [LIMIT]
    assert count_scheduled(migrated_engine, people) == 2


def test_rn08_horario_tomado_antes_da_confirmacao(
    migrated_engine: Engine, people: list[Person]
) -> None:
    """Sem disputa simultânea: o segundo cliente confirma depois do primeiro e
    recebe a mesma resposta."""
    barber, service = ids(migrated_engine)
    first, second = people
    with real_client(migrated_engine, first) as client:
        assert book(client, barber, service, TEN).status_code == 201
    with real_client(migrated_engine, second) as client:
        response = book(client, barber, service, TEN + timedelta(minutes=30))

    assert response.status_code == 409
    assert response.json() == UNAVAILABLE


def test_rn05_rn13_edicao_do_servico_espera_a_reserva_do_cliente(
    migrated_engine: Engine, people: list[Person], monkeypatch: MonkeyPatch
) -> None:
    """Terça das 10h às 19h, Corte + Barba com 45 min, pedido às 18h. Entre a
    conferência do horário e a gravação, outra transação tenta mudar a duração
    para 90 min e confirmar. A trava do serviço a faz esperar: o agendamento é
    gravado com a duração conferida e não passa do fechamento."""
    barber, service = ids(migrated_engine)
    original = booking_service.ensure_slot_available
    blocked: list[bool] = []

    def checked_then_edit(*args: Any, **kwargs: Any) -> None:
        original(*args, **kwargs)
        with migrated_engine.connect() as connection:
            transaction = connection.begin()
            connection.execute(text("SET LOCAL lock_timeout = '200ms'"))
            try:
                connection.execute(
                    text("UPDATE services SET duration_minutes = 90 WHERE id = :id"),
                    {"id": service},
                )
            except DBAPIError:
                blocked.append(True)
                transaction.rollback()
            else:
                transaction.commit()

    monkeypatch.setattr(booking_service, "ensure_slot_available", checked_then_edit)
    six_pm = local(2026, 11, 3, 18)
    try:
        with real_client(migrated_engine, people[0]) as client:
            response = book(client, barber, service, six_pm)
    finally:
        with migrated_engine.begin() as connection:
            connection.execute(
                text("UPDATE services SET duration_minutes = 45 WHERE id = :id"),
                {"id": service},
            )

    assert response.status_code == 201, response.json()
    assert response.json()["duration_minutes"] == 45
    assert datetime.fromisoformat(response.json()["ends_at"]) == six_pm + timedelta(
        minutes=45
    )
    assert blocked == [True]
