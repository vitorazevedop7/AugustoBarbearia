"""Rota pública de horários e funções da S3.08 (RN-05 a RN-08), com o banco."""

from collections.abc import Iterator
from datetime import UTC, datetime
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.clock import utc_now
from app.db import get_session
from app.errors import DomainError
from app.main import create_app
from app.modules.appointments.models import AppointmentStatus
from app.modules.availability.service import (
    ensure_slot_available,
    is_slot_available,
)
from app.modules.barbers.models import Barber
from app.modules.shop.models import BusinessHours
from tests.factories import barber_id, local, make_appointment, service_by_name

# Segunda-feira, 2/11/2026, 8h em São Paulo. A consulta padrão é a terça, 3/11.
NOW = local(2026, 11, 2, 8)
TUESDAY = "2026-11-03"


class Clock:
    """Relógio dos testes; começa em `NOW` e pode ser adiantado."""

    def __init__(self) -> None:
        self.now = NOW.astimezone(UTC)


@pytest.fixture
def clock() -> Clock:
    return Clock()


@pytest.fixture
def public(db_session: Session, clock: Clock) -> Iterator[TestClient]:
    """API sem login, com o relógio dos testes."""
    app = create_app()
    app.dependency_overrides[get_session] = lambda: db_session
    app.dependency_overrides[utc_now] = lambda: clock.now
    with TestClient(app) as client:
        yield client


@pytest.fixture
def edvaldo(db_session: Session) -> int:
    return barber_id(db_session, "Edvaldo")


@pytest.fixture
def corte(db_session: Session) -> int:
    return service_by_name(db_session, "Corte Simples").id


@pytest.fixture
def corte_e_barba(db_session: Session) -> int:
    return service_by_name(db_session, "Corte + Barba").id


def availability(
    public: TestClient, barber: int, service: int, day: str = TUESDAY
) -> Any:
    response = public.get(
        "/public/availability",
        params={"barber_id": barber, "service_id": service, "date": day},
    )
    assert response.status_code == 200, response.json()
    return response.json()


def local_starts(body: Any) -> list[str]:
    return [slot["starts_at"][11:16] for slot in body["slots"]]


def test_rn05_rota_publica_sem_login_lista_os_horarios(
    public: TestClient, edvaldo: int, corte: int
) -> None:
    body = availability(public, edvaldo, corte)

    assert body["barber_id"] == edvaldo
    assert body["service_id"] == corte
    assert body["date"] == TUESDAY
    assert len(body["slots"]) == 18
    assert body["slots"][0] == {
        "starts_at": "2026-11-03T10:00:00-03:00",
        "ends_at": "2026-11-03T10:30:00-03:00",
    }
    assert body["slots"][-1] == {
        "starts_at": "2026-11-03T18:30:00-03:00",
        "ends_at": "2026-11-03T19:00:00-03:00",
    }


def test_rn05_exemplo_corte_e_barba_as_10h_proximo_inicio_as_11h(
    public: TestClient, db_session: Session, edvaldo: int, corte_e_barba: int
) -> None:
    make_appointment(db_session, barber=edvaldo, starts_at=local(2026, 11, 3, 10))

    starts = local_starts(availability(public, edvaldo, corte_e_barba))

    assert starts[0] == "11:00"
    assert starts[-1] == "18:00"
    assert "10:30" not in starts


@pytest.mark.parametrize(
    "status",
    [
        AppointmentStatus.CANCELED,
        AppointmentStatus.COMPLETED,
        AppointmentStatus.NO_SHOW,
    ],
)
def test_rn08_rn30_rn32_so_agendamento_ativo_ocupa_o_horario(
    public: TestClient,
    db_session: Session,
    edvaldo: int,
    corte: int,
    status: AppointmentStatus,
) -> None:
    make_appointment(
        db_session, barber=edvaldo, starts_at=local(2026, 11, 3, 10), status=status
    )

    assert local_starts(availability(public, edvaldo, corte))[0] == "10:00"


def test_rn08_agendamento_de_outro_barbeiro_nao_ocupa(
    public: TestClient, db_session: Session, edvaldo: int, corte: int
) -> None:
    make_appointment(
        db_session,
        barber=barber_id(db_session, "Lauro"),
        starts_at=local(2026, 11, 3, 10),
    )

    assert local_starts(availability(public, edvaldo, corte))[0] == "10:00"


def test_rn08_agendamento_de_outro_dia_nao_ocupa(
    public: TestClient, db_session: Session, edvaldo: int, corte: int
) -> None:
    make_appointment(db_session, barber=edvaldo, starts_at=local(2026, 11, 4, 10))

    assert len(availability(public, edvaldo, corte)["slots"]) == 18


def test_rn02_domingo_fechado_nao_tem_horario(
    public: TestClient, edvaldo: int, corte: int
) -> None:
    assert availability(public, edvaldo, corte, "2026-11-08")["slots"] == []


def test_rn02_sabado_segue_o_horario_do_dia(
    public: TestClient, edvaldo: int, corte_e_barba: int
) -> None:
    starts = local_starts(availability(public, edvaldo, corte_e_barba, "2026-11-07"))

    assert starts[0] == "09:00"
    assert starts[-1] == "13:00"


def test_rn02_usa_o_horario_configurado_pela_administracao(
    public: TestClient, db_session: Session, edvaldo: int, corte: int
) -> None:
    tuesday = db_session.get(BusinessHours, 1)
    assert tuesday is not None
    tuesday.opens_at = None
    tuesday.closes_at = None
    db_session.flush()

    assert availability(public, edvaldo, corte)["slots"] == []


def test_rn06_antecedencia_de_1_hora_no_proprio_dia(
    public: TestClient, clock: Clock, edvaldo: int, corte: int
) -> None:
    clock.now = local(2026, 11, 3, 10, 10)

    assert local_starts(availability(public, edvaldo, corte))[0] == "11:30"


def test_rn06_dia_que_ja_passou_responde_lista_vazia(
    public: TestClient, edvaldo: int, corte: int
) -> None:
    assert availability(public, edvaldo, corte, "2026-10-30")["slots"] == []


def test_rn07_janela_de_30_dias(public: TestClient, edvaldo: int, corte: int) -> None:
    # Hoje é 2/11: 2/12 é o dia 30 (quarta) e 3/12 é o dia 31 (quinta).
    assert len(availability(public, edvaldo, corte, "2026-12-02")["slots"]) == 18
    assert availability(public, edvaldo, corte, "2026-12-03")["slots"] == []


def test_rn05_item5_barbeiro_inativo_nao_tem_horario(
    public: TestClient, db_session: Session, edvaldo: int, corte: int
) -> None:
    barber = db_session.get(Barber, edvaldo)
    assert barber is not None
    barber.active = False
    db_session.flush()

    assert availability(public, edvaldo, corte)["slots"] == []


def test_rn05_item5_servico_inativo_nao_tem_horario(
    public: TestClient, db_session: Session, edvaldo: int
) -> None:
    service = service_by_name(db_session, "Corte Simples")
    service.active = False
    db_session.flush()

    assert availability(public, edvaldo, service.id)["slots"] == []


def test_rn05_item5_barbeiro_que_nao_realiza_o_servico_nao_tem_horario(
    public: TestClient, db_session: Session, edvaldo: int
) -> None:
    service = service_by_name(db_session, "Corte Simples")
    lauro = db_session.get(Barber, barber_id(db_session, "Lauro"))
    assert lauro is not None
    service.barbers = [lauro]
    db_session.flush()

    assert availability(public, edvaldo, service.id)["slots"] == []
    assert len(availability(public, lauro.id, service.id)["slots"]) == 18


@pytest.mark.parametrize(
    ("which", "code", "message"),
    [
        ("barber", "BARBER_NOT_FOUND", "Barbeiro não encontrado."),
        ("service", "SERVICE_NOT_FOUND", "Serviço não encontrado."),
    ],
)
def test_barbeiro_ou_servico_inexistente(
    public: TestClient,
    edvaldo: int,
    corte: int,
    which: str,
    code: str,
    message: str,
) -> None:
    params = {"barber_id": edvaldo, "service_id": corte, "date": TUESDAY}
    params[f"{which}_id"] = 999999

    response = public.get("/public/availability", params=params)

    assert response.status_code == 404
    assert response.json() == {"code": code, "message": message}


@pytest.mark.parametrize(
    "params",
    [
        {"service_id": 1, "date": TUESDAY},
        {"barber_id": 1, "date": TUESDAY},
        {"barber_id": 1, "service_id": 1},
        {"barber_id": 1, "service_id": 1, "date": "03/11/2026"},
        {"barber_id": 1, "service_id": 1, "date": "2026-02-30"},
        {"barber_id": "um", "service_id": 1, "date": TUESDAY},
    ],
)
def test_parametros_invalidos(public: TestClient, params: dict[str, object]) -> None:
    response = public.get("/public/availability", params=params)

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"


def test_rn05_horario_especifico_disponivel(
    db_session: Session, edvaldo: int, corte_e_barba: int
) -> None:
    make_appointment(db_session, barber=edvaldo, starts_at=local(2026, 11, 3, 10))

    def available(starts_at: datetime) -> bool:
        return is_slot_available(
            db_session,
            barber_id=edvaldo,
            service_id=corte_e_barba,
            starts_at=starts_at,
            now=NOW,
        )

    assert available(local(2026, 11, 3, 11))
    assert available(local(2026, 11, 3, 14).astimezone(UTC))
    assert not available(local(2026, 11, 3, 10, 30))  # cruza o das 10h
    assert not available(local(2026, 11, 3, 11, 15))  # fora da grade (RN-04)
    assert not available(local(2026, 11, 3, 18, 30))  # passa do fechamento
    assert not available(local(2026, 11, 8, 10))  # domingo


def test_rn08_garantia_de_horario_livre_para_a_criacao(
    db_session: Session, edvaldo: int, corte_e_barba: int
) -> None:
    make_appointment(db_session, barber=edvaldo, starts_at=local(2026, 11, 3, 10))

    ensure_slot_available(
        db_session,
        barber_id=edvaldo,
        service_id=corte_e_barba,
        starts_at=local(2026, 11, 3, 11),
        now=NOW,
    )
    with pytest.raises(DomainError) as error:
        ensure_slot_available(
            db_session,
            barber_id=edvaldo,
            service_id=corte_e_barba,
            starts_at=local(2026, 11, 3, 10),
            now=NOW,
        )

    assert error.value.status_code == 409
    assert error.value.code == "SLOT_UNAVAILABLE"
    assert error.value.message == (
        "Este horário não está mais disponível. Escolha outro."
    )


def test_rn01_horario_especifico_exige_fuso(
    db_session: Session, edvaldo: int, corte: int
) -> None:
    with pytest.raises(ValueError):
        is_slot_available(
            db_session,
            barber_id=edvaldo,
            service_id=corte,
            starts_at=datetime(2026, 11, 3, 10),
            now=NOW,
        )


def available_days(public: TestClient, barber: int, service: int) -> list[str]:
    response = public.get(
        "/public/availability/days",
        params={"barber_id": barber, "service_id": service},
    )
    assert response.status_code == 200, response.json()
    body = response.json()
    assert body["barber_id"] == barber
    assert body["service_id"] == service
    return body["days"]


def test_rn07_dias_com_horario_vao_de_hoje_ate_30_dias_sem_domingo(
    public: TestClient, edvaldo: int, corte: int
) -> None:
    days = available_days(public, edvaldo, corte)

    # Hoje é segunda, 2/11, às 8h: hoje ainda tem horário. A janela vai até
    # 2/12 (dia 30); os 4 domingos do caminho ficam de fora.
    assert days[0] == "2026-11-02"
    assert days[-1] == "2026-12-02"
    assert "2026-11-08" not in days
    assert len(days) == 31 - 4
    assert days == sorted(days)


def test_rn06_hoje_sai_da_lista_quando_nao_resta_horario(
    public: TestClient, clock: Clock, edvaldo: int, corte: int
) -> None:
    clock.now = local(2026, 11, 2, 18, 1)

    days = available_days(public, edvaldo, corte)

    assert days[0] == "2026-11-03"
    assert days[-1] == "2026-12-02"


def test_rn05_dia_lotado_sai_da_lista(
    public: TestClient, db_session: Session, edvaldo: int, corte: int
) -> None:
    # Sábado, 7/11, das 9h às 14h: um agendamento ocupa o dia inteiro.
    make_appointment(
        db_session,
        barber=edvaldo,
        starts_at=local(2026, 11, 7, 9),
        duration_minutes=300,
    )

    days = available_days(public, edvaldo, corte)

    assert "2026-11-07" not in days
    assert "2026-11-06" in days


def test_rn05_lista_de_dias_usa_a_mesma_conta_dos_horarios(
    public: TestClient, db_session: Session, edvaldo: int, corte_e_barba: int
) -> None:
    make_appointment(db_session, barber=edvaldo, starts_at=local(2026, 11, 3, 10))

    for day in available_days(public, edvaldo, corte_e_barba):
        assert availability(public, edvaldo, corte_e_barba, day)["slots"], day


def test_rn05_item5_sem_oferta_a_lista_de_dias_e_vazia(
    public: TestClient, db_session: Session, edvaldo: int, corte: int
) -> None:
    barber = db_session.get(Barber, edvaldo)
    assert barber is not None
    barber.active = False
    db_session.flush()

    assert available_days(public, edvaldo, corte) == []


@pytest.mark.parametrize(
    ("which", "code"),
    [("barber", "BARBER_NOT_FOUND"), ("service", "SERVICE_NOT_FOUND")],
)
def test_lista_de_dias_com_barbeiro_ou_servico_inexistente(
    public: TestClient, edvaldo: int, corte: int, which: str, code: str
) -> None:
    params = {"barber_id": edvaldo, "service_id": corte}
    params[f"{which}_id"] = 999999

    response = public.get("/public/availability/days", params=params)

    assert response.status_code == 404
    assert response.json()["code"] == code
