"""Bloqueios e folgas (RN-03) e a entrada deles no cálculo de horários (RN-05)."""

import threading
from collections.abc import Iterator
from dataclasses import dataclass
from datetime import UTC, date, time, timedelta
from decimal import Decimal
from typing import Any

import pytest
from fastapi.testclient import TestClient
from pytest import MonkeyPatch
from sqlalchemy import Engine, insert, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.clock import utc_now
from app.db import get_session
from app.errors import DomainError
from app.main import create_app
from app.modules.appointments.models import (
    Appointment,
    AppointmentSource,
    AppointmentStatus,
)
from app.modules.availability.service import (
    Rescheduling,
    ensure_slot_available,
    list_available_slots,
)
from app.modules.barbers.models import Barber
from app.modules.catalog.models import Service
from app.modules.time_blocks import service as time_blocks_service
from app.modules.time_blocks.models import OVERLAP_CONSTRAINT, TimeBlock
from app.modules.time_blocks.schemas import TimeBlockCreate
from app.modules.time_blocks.service import create_time_block
from tests.factories import barber_id, local, make_appointment, service_by_name

# Segunda-feira, 2/11/2026, 8h em São Paulo. Os bloqueios são na terça, 3/11.
NOW = local(2026, 11, 2, 8)
TUESDAY = "2026-11-03"
WEEK = {"start": "2026-11-02", "end": "2026-11-08"}

CONFLICT = {
    "code": "TIME_BLOCK_CONFLICT",
    "message": (
        "Este barbeiro tem agendamento marcado nesse intervalo. Cancele ou "
        "remarque o agendamento antes de bloquear."
    ),
}
OVERLAP = {
    "code": "TIME_BLOCK_OVERLAP",
    "message": (
        "Este intervalo cruza outro bloqueio do barbeiro. Remova o bloqueio "
        "existente ou escolha outro horário."
    ),
}
NOT_FOUND = {"code": "TIME_BLOCK_NOT_FOUND", "message": "Bloqueio não encontrado."}
UNAVAILABLE = {
    "code": "SLOT_UNAVAILABLE",
    "message": "Este horário não está mais disponível. Escolha outro.",
}


@pytest.fixture
def edvaldo(db_session: Session) -> int:
    return barber_id(db_session, "Edvaldo")


@pytest.fixture
def other_barber(db_session: Session, edvaldo: int) -> int:
    found = db_session.scalar(select(Barber.id).where(Barber.id != edvaldo).limit(1))
    assert found is not None
    return found


@pytest.fixture
def public(db_session: Session) -> Iterator[TestClient]:
    """API sem login, com o relógio fixo em `NOW`."""
    app = create_app()
    app.dependency_overrides[get_session] = lambda: db_session
    app.dependency_overrides[utc_now] = lambda: NOW.astimezone(UTC)
    with TestClient(app) as client:
        yield client


def block(
    admin: TestClient,
    barber: int,
    start: str | None = "12:00",
    end: str | None = "13:00",
    day: str = TUESDAY,
    reason: str | None = None,
) -> Any:
    body: dict[str, Any] = {"barber_id": barber, "date": day}
    if start is not None:
        body["start_time"] = start
    if end is not None:
        body["end_time"] = end
    if reason is not None:
        body["reason"] = reason
    return admin.post("/admin/time-blocks", json=body)


def created(admin: TestClient, barber: int, **kwargs: Any) -> Any:
    response = block(admin, barber, **kwargs)
    assert response.status_code == 201, response.json()
    return response.json()


def starts(public: TestClient, barber: int, service: str, day: str = TUESDAY) -> Any:
    response = public.get(
        "/public/availability",
        params={"barber_id": barber, "service_id": service, "date": day},
    )
    assert response.status_code == 200, response.json()
    return [slot["starts_at"][11:16] for slot in response.json()["slots"]]


# --- Criação (RN-03) ---------------------------------------------------------


def test_rn03_administracao_bloqueia_um_intervalo(
    admin: TestClient, edvaldo: int
) -> None:
    body = created(admin, edvaldo, reason="  Almoço  ")

    assert body == {
        "id": body["id"],
        "barber": {"id": edvaldo, "name": "Edvaldo", "active": True},
        "starts_at": "2026-11-03T12:00:00-03:00",
        "ends_at": "2026-11-03T13:00:00-03:00",
        "all_day": False,
        "reason": "Almoço",
    }


def test_rn03_motivo_vazio_vira_nulo_e_segundos_sao_descartados(
    admin: TestClient, edvaldo: int
) -> None:
    body = created(admin, edvaldo, start="12:00:30", end="13:00:59", reason="   ")

    assert body["starts_at"] == "2026-11-03T12:00:00-03:00"
    assert body["ends_at"] == "2026-11-03T13:00:00-03:00"
    assert body["reason"] is None


def test_rn03_rn01_folga_de_dia_inteiro_vai_da_meia_noite_a_meia_noite(
    admin: TestClient, edvaldo: int
) -> None:
    body = created(admin, edvaldo, start=None, end=None, reason="Folga")

    assert body["starts_at"] == "2026-11-03T00:00:00-03:00"
    assert body["ends_at"] == "2026-11-04T00:00:00-03:00"
    assert body["all_day"] is True


def test_rn03_folga_em_dia_fechado_e_aceita(admin: TestClient, edvaldo: int) -> None:
    # Domingo, 8/11, é fechado (RN-02): o bloqueio não atrapalha nada.
    assert block(admin, edvaldo, None, None, day="2026-11-08").status_code == 201


@pytest.mark.parametrize(
    ("start", "end", "day", "message"),
    [
        ("12:00", None, TUESDAY, "Informe o início e o fim, ou marque o dia inteiro."),
        (None, "13:00", TUESDAY, "Informe o início e o fim, ou marque o dia inteiro."),
        ("13:00", "12:00", TUESDAY, "O fim do bloqueio precisa ser depois do início."),
        ("12:00", "12:00", TUESDAY, "O fim do bloqueio precisa ser depois do início."),
        (None, None, "9999-12-31", "Escolha uma data válida."),
    ],
)
def test_rn03_horarios_invalidos(
    admin: TestClient,
    db_session: Session,
    edvaldo: int,
    start: str | None,
    end: str | None,
    day: str,
    message: str,
) -> None:
    response = block(admin, edvaldo, start, end, day=day)

    assert response.status_code == 422
    assert response.json() == {"code": "INVALID_TIME_BLOCK", "message": message}
    assert db_session.scalar(select(TimeBlock.id)) is None


@pytest.mark.parametrize(
    "body",
    [
        {"date": "03/11/2026"},
        {"start_time": "meio-dia", "end_time": "13:00"},
        {"reason": "x" * 121},
        {"barber_id": None},
    ],
)
def test_corpo_invalido(admin: TestClient, edvaldo: int, body: dict[str, Any]) -> None:
    payload = {"barber_id": edvaldo, "date": TUESDAY, **body}

    response = admin.post("/admin/time-blocks", json=payload)

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"


def test_barbeiro_inexistente(admin: TestClient) -> None:
    response = block(admin, 999_999)

    assert response.status_code == 404
    assert response.json()["code"] == "BARBER_NOT_FOUND"


@pytest.mark.parametrize(
    ("start", "end"),
    [("12:00", "13:00"), ("12:45", "13:00"), (None, None)],
)
def test_rn03_bloqueio_sobre_agendamento_ativo_e_recusado(
    admin: TestClient,
    db_session: Session,
    edvaldo: int,
    start: str | None,
    end: str | None,
) -> None:
    make_appointment(db_session, barber=edvaldo, starts_at=local(2026, 11, 3, 12, 30))

    response = block(admin, edvaldo, start, end)

    assert response.status_code == 409
    assert response.json() == CONFLICT
    assert db_session.scalar(select(TimeBlock.id)) is None


@pytest.mark.parametrize(
    "status",
    [
        AppointmentStatus.CANCELED,
        AppointmentStatus.COMPLETED,
        AppointmentStatus.NO_SHOW,
    ],
)
def test_rn03_rn30_agendamento_que_nao_esta_ativo_nao_impede(
    admin: TestClient, db_session: Session, edvaldo: int, status: AppointmentStatus
) -> None:
    make_appointment(
        db_session, barber=edvaldo, starts_at=local(2026, 11, 3, 12), status=status
    )

    assert block(admin, edvaldo).status_code == 201


def test_rn03_agendamento_que_encosta_ou_de_outro_barbeiro_nao_impede(
    admin: TestClient, db_session: Session, edvaldo: int, other_barber: int
) -> None:
    # Termina às 12h00 e começa às 13h00: encostam no bloqueio, não cruzam.
    make_appointment(db_session, barber=edvaldo, starts_at=local(2026, 11, 3, 11, 15))
    make_appointment(db_session, barber=edvaldo, starts_at=local(2026, 11, 3, 13))
    make_appointment(db_session, barber=other_barber, starts_at=local(2026, 11, 3, 12))

    assert block(admin, edvaldo).status_code == 201


def test_rn03_agendamento_ativo_que_ja_terminou_tambem_impede(
    admin: TestClient, db_session: Session, edvaldo: int
) -> None:
    """Um `SCHEDULED` no passado continua ativo (RN-30) até a conclusão."""
    make_appointment(db_session, barber=edvaldo, starts_at=local(2026, 10, 1, 12))

    response = block(admin, edvaldo, day="2026-10-01")

    assert response.status_code == 409
    assert response.json() == CONFLICT


@pytest.mark.parametrize(
    ("start", "end"), [("12:30", "14:00"), ("11:00", "12:01"), (None, None)]
)
def test_dois_bloqueios_cruzados_do_mesmo_barbeiro_sao_recusados(
    admin: TestClient, edvaldo: int, start: str | None, end: str | None
) -> None:
    created(admin, edvaldo)

    response = block(admin, edvaldo, start, end)

    assert response.status_code == 409
    assert response.json() == OVERLAP


def test_bloqueio_que_encosta_ou_de_outro_barbeiro_e_aceito(
    admin: TestClient, edvaldo: int, other_barber: int
) -> None:
    created(admin, edvaldo)

    assert block(admin, edvaldo, "13:00", "14:00").status_code == 201
    assert block(admin, edvaldo, "11:00", "12:00").status_code == 201
    assert block(admin, other_barber).status_code == 201


def test_banco_recusa_bloqueios_cruzados(db_session: Session, edvaldo: int) -> None:
    db_session.add(
        TimeBlock(
            barber_id=edvaldo,
            starts_at=local(2026, 11, 3, 12),
            ends_at=local(2026, 11, 3, 13),
        )
    )
    db_session.flush()

    with pytest.raises(IntegrityError) as error, db_session.begin_nested():
        db_session.add(
            TimeBlock(
                barber_id=edvaldo,
                starts_at=local(2026, 11, 3, 12, 30),
                ends_at=local(2026, 11, 3, 14),
            )
        )
        db_session.flush()

    constraint = getattr(error.value.orig, "diag", None)
    assert getattr(constraint, "constraint_name", None) == OVERLAP_CONSTRAINT


def test_banco_recusa_fim_antes_do_inicio(db_session: Session, edvaldo: int) -> None:
    with pytest.raises(IntegrityError), db_session.begin_nested():
        db_session.add(
            TimeBlock(
                barber_id=edvaldo,
                starts_at=local(2026, 11, 3, 13),
                ends_at=local(2026, 11, 3, 12),
            )
        )
        db_session.flush()


# --- Disponibilidade (RN-05, item 3) -----------------------------------------


def test_rn05_rn03_bloqueio_tira_os_horarios_na_hora(
    admin: TestClient, public: TestClient, db_session: Session, edvaldo: int
) -> None:
    corte = str(service_by_name(db_session, "Corte Simples").id)
    corte_e_barba = str(service_by_name(db_session, "Corte + Barba").id)
    assert "12:00" in starts(public, edvaldo, corte)

    created(admin, edvaldo)

    simple = starts(public, edvaldo, corte)
    assert "11:30" in simple and "13:00" in simple
    assert "12:00" not in simple and "12:30" not in simple
    # 45 min: 11h30 terminaria às 12h15, dentro do bloqueio.
    long = starts(public, edvaldo, corte_e_barba)
    assert "11:00" in long and "11:30" not in long and "13:00" in long


def test_rn05_rn03_bloqueio_de_outro_barbeiro_nao_afeta(
    admin: TestClient,
    public: TestClient,
    db_session: Session,
    edvaldo: int,
    other_barber: int,
) -> None:
    corte = str(service_by_name(db_session, "Corte Simples").id)
    before = starts(public, edvaldo, corte)

    created(admin, other_barber)

    assert starts(public, edvaldo, corte) == before


def test_rn05_rn03_folga_tira_o_dia_da_lista_de_dias(
    admin: TestClient, public: TestClient, db_session: Session, edvaldo: int
) -> None:
    corte = service_by_name(db_session, "Corte Simples").id
    params = {"barber_id": edvaldo, "service_id": corte}
    assert (
        TUESDAY in public.get("/public/availability/days", params=params).json()["days"]
    )

    created(admin, edvaldo, start=None, end=None)

    assert starts(public, edvaldo, str(corte)) == []
    days = public.get("/public/availability/days", params=params).json()["days"]
    assert TUESDAY not in days
    assert "2026-11-04" in days


def test_rn05_rn03_criacao_e_remarcacao_no_bloqueio_sao_recusadas(
    admin: TestClient, db_session: Session, edvaldo: int
) -> None:
    service = service_by_name(db_session, "Corte Simples")
    created(admin, edvaldo)

    with pytest.raises(DomainError) as error:
        ensure_slot_available(
            db_session,
            barber_id=edvaldo,
            service_id=service.id,
            starts_at=local(2026, 11, 3, 12),
            now=NOW,
        )
    assert error.value.code == UNAVAILABLE["code"]

    # Remarcação (RN-15): o agendamento das 10h não pode ir para o bloqueio.
    moved = make_appointment(
        db_session,
        barber=edvaldo,
        starts_at=local(2026, 11, 3, 10),
        duration_minutes=30,
        service=service,
    )
    slots = list_available_slots(
        db_session,
        barber_id=edvaldo,
        service_id=service.id,
        day=date(2026, 11, 3),
        now=NOW,
        rescheduling=Rescheduling(
            appointment_id=moved.id,
            barber_id=edvaldo,
            starts_at=moved.starts_at,
            duration=timedelta(minutes=30),
        ),
    )
    offered = {slot.start.time() for slot in slots}
    assert time(11, 30) in offered and time(13) in offered
    assert time(12) not in offered and time(12, 30) not in offered


def test_rn05_remover_o_bloqueio_devolve_os_horarios(
    admin: TestClient, public: TestClient, db_session: Session, edvaldo: int
) -> None:
    corte = str(service_by_name(db_session, "Corte Simples").id)
    body = created(admin, edvaldo)
    assert "12:00" not in starts(public, edvaldo, corte)

    response = admin.delete(f"/admin/time-blocks/{body['id']}")

    assert response.status_code == 204
    assert "12:00" in starts(public, edvaldo, corte)
    assert admin.get(f"/admin/time-blocks/{body['id']}").json() == NOT_FOUND


# --- Leitura e remoção -------------------------------------------------------


def test_bloqueios_do_periodo_por_inicio(
    admin: TestClient, edvaldo: int, other_barber: int
) -> None:
    folga = created(admin, other_barber, start=None, end=None, day="2026-11-04")
    almoco = created(admin, edvaldo, day="2026-11-02")
    cedo = created(admin, edvaldo, start="09:00", end="10:00", day="2026-11-04")
    # Fora do período: domingo anterior e segunda seguinte.
    created(admin, edvaldo, start=None, end=None, day="2026-11-01")
    created(admin, edvaldo, start="00:00", end="01:00", day="2026-11-09")

    response = admin.get("/admin/time-blocks", params=WEEK)

    assert response.status_code == 200
    assert [item["id"] for item in response.json()] == [
        almoco["id"],
        folga["id"],
        cedo["id"],
    ]
    assert response.json()[1] == folga


def test_bloqueios_filtrados_por_barbeiro(
    admin: TestClient, edvaldo: int, other_barber: int
) -> None:
    mine = created(admin, edvaldo)
    created(admin, other_barber)

    response = admin.get(
        "/admin/time-blocks", params={**WEEK, "barber_id": str(edvaldo)}
    )

    assert [item["id"] for item in response.json()] == [mine["id"]]
    missing = admin.get("/admin/time-blocks", params={**WEEK, "barber_id": "999999"})
    assert missing.status_code == 404
    assert missing.json()["code"] == "BARBER_NOT_FOUND"


def test_rn01_bloqueio_da_noite_de_segunda_fica_na_segunda(
    admin: TestClient, edvaldo: int
) -> None:
    """23h às 23h30 de São Paulo já é terça em UTC; o bloqueio é de segunda."""
    night = created(admin, edvaldo, start="23:00", end="23:30", day="2026-11-02")

    monday = admin.get(
        "/admin/time-blocks", params={"start": "2026-11-02", "end": "2026-11-02"}
    )
    tuesday = admin.get(
        "/admin/time-blocks", params={"start": "2026-11-03", "end": "2026-11-03"}
    )

    assert [item["id"] for item in monday.json()] == [night["id"]]
    assert tuesday.json() == []


@pytest.mark.parametrize(
    ("params", "message"),
    [
        (
            {"start": "2026-11-08", "end": "2026-11-02"},
            "A data final precisa ser igual ou posterior à inicial.",
        ),
        (
            {"start": "2026-11-02", "end": "2026-11-09"},
            "Escolha um período de até 7 dias.",
        ),
    ],
)
def test_periodo_invalido(
    admin: TestClient, params: dict[str, str], message: str
) -> None:
    response = admin.get("/admin/time-blocks", params=params)

    assert response.status_code == 422
    assert response.json() == {"code": "INVALID_PERIOD", "message": message}


def test_detalhe_e_remocao_de_bloqueio_inexistente(admin: TestClient) -> None:
    assert admin.get("/admin/time-blocks/999999").json() == NOT_FOUND
    response = admin.delete("/admin/time-blocks/999999")
    assert response.status_code == 404
    assert response.json() == NOT_FOUND


def test_detalhe_do_bloqueio(admin: TestClient, edvaldo: int) -> None:
    body = created(admin, edvaldo, reason="Médico")

    response = admin.get(f"/admin/time-blocks/{body['id']}")

    assert response.status_code == 200
    assert response.json() == body


def test_rn70_cliente_recebe_403_e_sem_token_401(
    client: TestClient, customer: TestClient, admin: TestClient, edvaldo: int
) -> None:
    body = created(admin, edvaldo)
    requests = [
        ("get", "/admin/time-blocks", {"params": WEEK}),
        (
            "post",
            "/admin/time-blocks",
            {"json": {"barber_id": edvaldo, "date": TUESDAY}},
        ),
        ("get", f"/admin/time-blocks/{body['id']}", {}),
        ("delete", f"/admin/time-blocks/{body['id']}", {}),
    ]
    for method, path, kwargs in requests:
        as_customer = getattr(customer, method)(path, **kwargs)
        anonymous = getattr(client, method)(path, **kwargs)
        assert as_customer.status_code == 403
        assert as_customer.json()["code"] == "HTTP_403"
        assert anonymous.status_code == 401
    assert admin.get(f"/admin/time-blocks/{body['id']}").status_code == 200


# --- Concorrência (RN-03 × RN-08) --------------------------------------------

REASON = "Concorrência #96"
TEN = local(2026, 11, 3, 10)


@dataclass(frozen=True)
class Seed:
    customer_id: int
    barber_id: int
    service_id: int


@pytest.fixture
def committed_seed(migrated_engine: Engine) -> Iterator[Seed]:
    """Dados confirmados de verdade, para transações em conexões próprias. Tudo
    o que os testes gravam é apagado no fim, mesmo se o teste falhar."""
    with migrated_engine.begin() as connection:
        customer_id = connection.execute(
            text(
                "INSERT INTO customers (name, phone)"
                " VALUES ('Concorrência bloqueio', '75900000096') RETURNING id"
            )
        ).scalar_one()
        barber = connection.execute(
            select(Barber.id).where(Barber.name == "Edvaldo")
        ).scalar_one()
        service = connection.execute(
            select(Service.id).where(Service.name == "Corte + Barba")
        ).scalar_one()
    try:
        yield Seed(customer_id=customer_id, barber_id=barber, service_id=service)
    finally:
        with migrated_engine.begin() as connection:
            connection.execute(
                text("DELETE FROM appointments WHERE customer_id = :id"),
                {"id": customer_id},
            )
            connection.execute(
                text("DELETE FROM time_blocks WHERE reason = :reason"),
                {"reason": REASON},
            )
            connection.execute(
                text("DELETE FROM customers WHERE id = :id"), {"id": customer_id}
            )


def insert_appointment(session: Session, seed: Seed) -> None:
    session.execute(
        insert(Appointment).values(
            customer_id=seed.customer_id,
            barber_id=seed.barber_id,
            service_id=seed.service_id,
            starts_at=TEN,
            ends_at=TEN + timedelta(minutes=45),
            price=Decimal("35.00"),
            duration_minutes=45,
            status=AppointmentStatus.SCHEDULED,
            source=AppointmentSource.ONLINE,
        )
    )


def block_request(seed: Seed) -> TimeBlockCreate:
    return TimeBlockCreate(
        barber_id=seed.barber_id,
        date=date(2026, 11, 3),
        start_time=time(10),
        end_time=time(11),
        reason=REASON,
    )


def counts(engine: Engine, seed: Seed) -> tuple[int, int]:
    with engine.connect() as connection:
        appointments = connection.execute(
            text("SELECT count(*) FROM appointments WHERE customer_id = :id"),
            {"id": seed.customer_id},
        ).scalar_one()
        blocks = connection.execute(
            text("SELECT count(*) FROM time_blocks WHERE reason = :reason"),
            {"reason": REASON},
        ).scalar_one()
    return appointments, blocks


@pytest.mark.parametrize(
    ("outcome", "expected", "expected_counts"),
    [("commit", "TIME_BLOCK_CONFLICT", (1, 0)), ("rollback", "criado", (0, 1))],
)
def test_rn03_rn08_bloqueio_espera_a_reserva_em_andamento(
    migrated_engine: Engine,
    committed_seed: Seed,
    outcome: str,
    expected: str,
    expected_counts: tuple[int, int],
) -> None:
    """A reserva já passou por `ensure_slot_available` (trava `FOR SHARE`). O
    bloqueio (`FOR UPDATE`) espera a reserva terminar: se ela confirmar, o
    bloqueio enxerga o agendamento e é recusado; se ela desistir, o bloqueio é
    criado."""
    results: list[str] = []

    def create_block() -> None:
        try:
            with Session(migrated_engine) as session:
                session.execute(text("SET LOCAL lock_timeout = '10s'"))
                create_time_block(session, block_request(committed_seed))
            results.append("criado")
        except DomainError as error:
            results.append(error.code)

    with Session(migrated_engine) as reservation:
        ensure_slot_available(
            reservation,
            barber_id=committed_seed.barber_id,
            service_id=committed_seed.service_id,
            starts_at=TEN,
            now=NOW,
        )
        thread = threading.Thread(target=create_block)
        thread.start()
        thread.join(timeout=0.5)
        assert thread.is_alive(), "o bloqueio deveria esperar a reserva"

        insert_appointment(reservation, committed_seed)
        if outcome == "commit":
            reservation.commit()
        else:
            reservation.rollback()
    thread.join(timeout=10)

    assert not thread.is_alive()
    assert results == [expected]
    assert counts(migrated_engine, committed_seed) == expected_counts


def test_rn03_rn08_reserva_espera_o_bloqueio_em_andamento(
    migrated_engine: Engine, committed_seed: Seed, monkeypatch: MonkeyPatch
) -> None:
    """O bloqueio travou o barbeiro e conferiu os agendamentos, mas ainda não
    confirmou. A reserva espera na trava de `ensure_slot_available` e, quando o
    bloqueio confirma, enxerga o bloqueio entre os ocupados e é recusada."""
    checked = threading.Event()
    release = threading.Event()
    original = time_blocks_service._overlaps_block  # pyright: ignore[reportPrivateUsage]

    def checked_then_wait(*args: Any, **kwargs: Any) -> bool:
        result = original(*args, **kwargs)
        checked.set()
        assert release.wait(timeout=10)
        return result

    monkeypatch.setattr(time_blocks_service, "_overlaps_block", checked_then_wait)
    results: list[str] = []

    def create_block() -> None:
        with Session(migrated_engine) as session:
            create_time_block(session, block_request(committed_seed))
        results.append("bloqueado")

    def reserve() -> None:
        try:
            with Session(migrated_engine) as session:
                session.execute(text("SET LOCAL lock_timeout = '10s'"))
                ensure_slot_available(
                    session,
                    barber_id=committed_seed.barber_id,
                    service_id=committed_seed.service_id,
                    starts_at=TEN,
                    now=NOW,
                )
                insert_appointment(session, committed_seed)
                session.commit()
            results.append("reservado")
        except DomainError as error:
            results.append(error.code)

    blocking = threading.Thread(target=create_block)
    reserving = threading.Thread(target=reserve)
    blocking.start()
    try:
        assert checked.wait(timeout=10)
        reserving.start()
        reserving.join(timeout=0.5)
        assert reserving.is_alive(), "a reserva deveria esperar o bloqueio"
    finally:
        release.set()
    blocking.join(timeout=10)
    reserving.join(timeout=10)

    assert not blocking.is_alive() and not reserving.is_alive()
    assert results == ["bloqueado", UNAVAILABLE["code"]]
    assert counts(migrated_engine, committed_seed) == (0, 1)
