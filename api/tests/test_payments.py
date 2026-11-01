"""Conclusão com pagamento, falta e correção (RN-31, RN-33, RN-40, RN-41, RN-70)."""

import threading
from collections.abc import Callable, Iterator
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.dependencies import current_user
from app.auth.schemas import CurrentUser
from app.clock import utc_now
from app.db import get_session
from app.errors import DomainError
from app.main import create_app
from app.modules.appointments.models import (
    Appointment,
    AppointmentStatus,
)
from app.modules.catalog.models import Service
from app.modules.payments import service as payments_service
from app.modules.payments.models import Payment, PaymentMethod
from tests.factories import barber_id, local, make_appointment, service_by_name

# Terça-feira, 3/11/2026, 10h00 em São Paulo: o agendamento de 35,00 (45 min).
START = local(2026, 11, 3, 10)
AFTER_START = local(2026, 11, 3, 10, 50)
ADMIN_EMAIL = "dono@barbearia.example.com"

NOT_STARTED = {
    "code": "APPOINTMENT_NOT_STARTED",
    "message": (
        "O horário de início ainda não chegou (03/11 às 10:00). "
        "Só dá para concluir ou marcar falta a partir dele."
    ),
}
CANCELED = {
    "code": "APPOINTMENT_NOT_ACTIVE",
    "message": (
        "Este agendamento foi cancelado, então não pode ser concluído "
        "nem marcado como falta."
    ),
}
ALREADY_COMPLETED = {
    "code": "APPOINTMENT_NOT_ACTIVE",
    "message": "Este atendimento já foi concluído.",
}
ALREADY_NO_SHOW = {
    "code": "APPOINTMENT_NOT_ACTIVE",
    "message": "Este agendamento já foi marcado como falta.",
}
NOT_FOUND = {"code": "APPOINTMENT_NOT_FOUND", "message": "Agendamento não encontrado."}
NEGATIVE = {
    "code": "INVALID_PAYMENT_AMOUNT",
    "message": "O valor cobrado não pode ser negativo.",
}
NOT_COMPLETED = {
    "code": "APPOINTMENT_NOT_COMPLETED",
    "message": "Só dá para corrigir o pagamento de um atendimento concluído.",
}
EMPTY_UPDATE = {
    "code": "EMPTY_PAYMENT_UPDATE",
    "message": "Informe o valor ou a forma de pagamento para corrigir.",
}


class Clock:
    def __init__(self) -> None:
        self.now = AFTER_START.astimezone(UTC)


@pytest.fixture
def clock() -> Clock:
    return Clock()


def admin_app(
    get_session_override: Callable[[], Any], now: Callable[[], datetime]
) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_session] = get_session_override
    app.dependency_overrides[utc_now] = now
    app.dependency_overrides[current_user] = lambda: CurrentUser(
        sub="admin-1", email=ADMIN_EMAIL, name="Dono", role="admin"
    )
    return TestClient(app)


@pytest.fixture
def api(db_session: Session, clock: Clock) -> TestClient:
    return admin_app(lambda: db_session, lambda: clock.now)


@pytest.fixture
def edvaldo(db_session: Session) -> int:
    return barber_id(db_session, "Edvaldo")


def scheduled(
    db_session: Session, barber: int, status: AppointmentStatus | None = None
) -> Appointment:
    return make_appointment(
        db_session,
        barber=barber,
        starts_at=START,
        price=Decimal("35.00"),
        status=status or AppointmentStatus.SCHEDULED,
    )


def payment_of(db_session: Session, appointment_id: int) -> Payment | None:
    db_session.expire_all()
    return db_session.scalars(
        select(Payment).where(Payment.appointment_id == appointment_id)
    ).one_or_none()


def complete(api: TestClient, appointment_id: int, **body: object) -> Any:
    return api.post(f"/admin/appointments/{appointment_id}/complete", json=body)


# Concluir.


def test_rn40_rn33_conclui_com_o_valor_padrao_do_preco_congelado(
    api: TestClient, db_session: Session, edvaldo: int, clock: Clock
) -> None:
    appointment = scheduled(db_session, edvaldo)
    # RN-13: mudar o preço do serviço depois não muda o que o agendamento sugere.
    service = service_by_name(db_session, "Corte + Barba")
    service.price = Decimal("99.00")
    db_session.flush()

    response = complete(api, appointment.id, method="PIX")

    assert response.status_code == 200, response.json()
    body = response.json()
    assert body["id"] == appointment.id
    assert body["status"] == "COMPLETED"
    assert body["price"] == "35.00"
    assert body["payment"] == {"amount": "35.00", "method": "PIX"}
    assert body["closed_by"] == ADMIN_EMAIL
    assert body["closed_at"] == "2026-11-03T10:50:00-03:00"
    payment = payment_of(db_session, appointment.id)
    assert payment is not None
    assert payment.amount == Decimal("35.00")
    assert payment.method == PaymentMethod.PIX
    assert db_session.get(Appointment, appointment.id).status == (  # type: ignore[union-attr]
        AppointmentStatus.COMPLETED
    )


@pytest.mark.parametrize(
    ("sent", "stored"),
    [
        ("30.00", "30.00"),
        ("30,00", "30.00"),
        ("1.234,50", "1234.50"),
        ("0", "0.00"),
        ("0,00", "0.00"),
        (0, "0.00"),
        ("40", "40.00"),
    ],
)
def test_rn40_conclui_com_desconto_ou_cortesia(
    api: TestClient,
    db_session: Session,
    edvaldo: int,
    sent: str | int,
    stored: str,
) -> None:
    appointment = scheduled(db_session, edvaldo)

    response = complete(api, appointment.id, method="CASH", amount=sent)

    assert response.status_code == 200, response.json()
    assert response.json()["payment"] == {"amount": stored, "method": "CASH"}
    # O preço congelado do agendamento não muda com o desconto.
    assert response.json()["price"] == "35.00"
    payment = payment_of(db_session, appointment.id)
    assert payment is not None
    assert payment.amount == Decimal(stored)


@pytest.mark.parametrize("method", ["CASH", "PIX", "DEBIT", "CREDIT"])
def test_rn40_aceita_as_quatro_formas_de_pagamento(
    api: TestClient, db_session: Session, edvaldo: int, method: str
) -> None:
    appointment = scheduled(db_session, edvaldo)

    response = complete(api, appointment.id, method=method)

    assert response.status_code == 200
    assert response.json()["payment"]["method"] == method


def test_rn31_no_instante_exato_do_inicio_ja_pode_concluir(
    api: TestClient, db_session: Session, edvaldo: int, clock: Clock
) -> None:
    appointment = scheduled(db_session, edvaldo)
    clock.now = START.astimezone(UTC)

    assert complete(api, appointment.id, method="PIX").status_code == 200


def test_rn31_nao_conclui_o_que_ainda_nao_comecou(
    api: TestClient, db_session: Session, edvaldo: int, clock: Clock
) -> None:
    appointment = scheduled(db_session, edvaldo)
    clock.now = (START - timedelta(seconds=1)).astimezone(UTC)

    response = complete(api, appointment.id, method="PIX")

    assert response.status_code == 409
    assert response.json() == NOT_STARTED
    db_session.expire_all()
    assert db_session.get(Appointment, appointment.id).status == (  # type: ignore[union-attr]
        AppointmentStatus.SCHEDULED
    )
    assert payment_of(db_session, appointment.id) is None


@pytest.mark.parametrize(
    ("status", "error"),
    [
        (AppointmentStatus.CANCELED, CANCELED),
        (AppointmentStatus.COMPLETED, ALREADY_COMPLETED),
        (AppointmentStatus.NO_SHOW, ALREADY_NO_SHOW),
    ],
)
def test_rn31_nao_conclui_o_que_nao_esta_ativo(
    api: TestClient,
    db_session: Session,
    edvaldo: int,
    status: AppointmentStatus,
    error: dict[str, str],
) -> None:
    appointment = scheduled(db_session, edvaldo, status)

    response = complete(api, appointment.id, method="PIX")

    assert response.status_code == 409
    assert response.json() == error
    assert payment_of(db_session, appointment.id) is None


def test_rn31_concluir_duas_vezes_recusa_a_segunda_e_mantem_um_pagamento(
    api: TestClient, db_session: Session, edvaldo: int
) -> None:
    appointment = scheduled(db_session, edvaldo)

    assert complete(api, appointment.id, method="PIX").status_code == 200
    second = complete(api, appointment.id, method="CASH", amount="10")

    assert second.status_code == 409
    assert second.json() == ALREADY_COMPLETED
    payment = payment_of(db_session, appointment.id)
    assert payment is not None
    assert (payment.amount, payment.method) == (Decimal("35.00"), PaymentMethod.PIX)


def test_rn31_agendamento_inexistente_responde_404(api: TestClient) -> None:
    for response in (
        complete(api, 999999, method="PIX"),
        api.post("/admin/appointments/999999/no-show"),
        api.patch("/admin/appointments/999999/payment", json={"method": "PIX"}),
    ):
        assert response.status_code == 404
        assert response.json() == NOT_FOUND


def test_rn40_valor_negativo_e_recusado_e_nada_e_gravado(
    api: TestClient, db_session: Session, edvaldo: int
) -> None:
    appointment = scheduled(db_session, edvaldo)

    response = complete(api, appointment.id, method="PIX", amount="-0,01")

    assert response.status_code == 422
    assert response.json() == NEGATIVE
    assert payment_of(db_session, appointment.id) is None
    db_session.expire_all()
    assert db_session.get(Appointment, appointment.id).status == (  # type: ignore[union-attr]
        AppointmentStatus.SCHEDULED
    )


@pytest.mark.parametrize(
    "body",
    [
        {},
        {"amount": "35.00"},
        {"method": "BOLETO"},
        {"method": "pix"},
        {"method": None},
        {"method": "PIX", "amount": "abc"},
        {"method": "PIX", "amount": "35.005"},
        {"method": "PIX", "amount": "123456789.00"},
    ],
)
def test_rn40_forma_ausente_ou_valor_malformado_e_recusado(
    api: TestClient, db_session: Session, edvaldo: int, body: dict[str, object]
) -> None:
    appointment = scheduled(db_session, edvaldo)

    response = complete(api, appointment.id, **body)

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"
    assert payment_of(db_session, appointment.id) is None


def test_rn32_o_horario_concluido_deixa_de_ocupar_a_agenda(
    api: TestClient, db_session: Session, edvaldo: int
) -> None:
    appointment = scheduled(db_session, edvaldo)
    complete(api, appointment.id, method="PIX")

    # A exclusion constraint (RN-08) só olha `SCHEDULED`: outro entra no mesmo horário.
    other = scheduled(db_session, edvaldo)

    assert other.status == AppointmentStatus.SCHEDULED


# Marcar falta.


def test_rn31_rn33_marca_falta_com_quem_e_quando(
    api: TestClient, db_session: Session, edvaldo: int
) -> None:
    appointment = scheduled(db_session, edvaldo)

    response = api.post(f"/admin/appointments/{appointment.id}/no-show")

    assert response.status_code == 200, response.json()
    body = response.json()
    assert body["status"] == "NO_SHOW"
    assert body["payment"] is None
    assert body["closed_by"] == ADMIN_EMAIL
    assert body["closed_at"] == "2026-11-03T10:50:00-03:00"
    assert payment_of(db_session, appointment.id) is None


def test_rn31_nao_marca_falta_antes_do_inicio(
    api: TestClient, db_session: Session, edvaldo: int, clock: Clock
) -> None:
    appointment = scheduled(db_session, edvaldo)
    clock.now = (START - timedelta(minutes=1)).astimezone(UTC)

    response = api.post(f"/admin/appointments/{appointment.id}/no-show")

    assert response.status_code == 409
    assert response.json() == NOT_STARTED


@pytest.mark.parametrize(
    ("status", "error"),
    [
        (AppointmentStatus.CANCELED, CANCELED),
        (AppointmentStatus.COMPLETED, ALREADY_COMPLETED),
        (AppointmentStatus.NO_SHOW, ALREADY_NO_SHOW),
    ],
)
def test_rn31_nao_marca_falta_do_que_nao_esta_ativo(
    api: TestClient,
    db_session: Session,
    edvaldo: int,
    status: AppointmentStatus,
    error: dict[str, str],
) -> None:
    appointment = scheduled(db_session, edvaldo, status)

    response = api.post(f"/admin/appointments/{appointment.id}/no-show")

    assert response.status_code == 409
    assert response.json() == error


# Corrigir o pagamento.


def completed(api: TestClient, db_session: Session, barber: int) -> int:
    appointment = scheduled(db_session, barber)
    assert complete(api, appointment.id, method="PIX").status_code == 200
    return appointment.id


@pytest.mark.parametrize(
    ("patch", "expected"),
    [
        ({"method": "CASH"}, {"amount": "35.00", "method": "CASH"}),
        ({"amount": "40,00"}, {"amount": "40.00", "method": "PIX"}),
        ({"amount": "0"}, {"amount": "0.00", "method": "PIX"}),
        (
            {"amount": "30.50", "method": "CREDIT"},
            {"amount": "30.50", "method": "CREDIT"},
        ),
    ],
)
def test_rn41_corrige_valor_e_forma_sem_voltar_o_status(
    api: TestClient,
    db_session: Session,
    edvaldo: int,
    patch: dict[str, str],
    expected: dict[str, str],
) -> None:
    appointment_id = completed(api, db_session, edvaldo)
    before = api.get(f"/admin/appointments/{appointment_id}").json()

    response = api.patch(f"/admin/appointments/{appointment_id}/payment", json=patch)

    assert response.status_code == 200, response.json()
    body = response.json()
    assert body["payment"] == expected
    assert body["status"] == "COMPLETED"
    # RN-33: quem e quando concluiu não mudam com a correção.
    assert (body["closed_at"], body["closed_by"]) == (
        before["closed_at"],
        before["closed_by"],
    )
    assert api.get(f"/admin/appointments/{appointment_id}").json() == body


def test_rn41_corrige_o_valor_negativo_e_recusado(
    api: TestClient, db_session: Session, edvaldo: int
) -> None:
    appointment_id = completed(api, db_session, edvaldo)

    response = api.patch(
        f"/admin/appointments/{appointment_id}/payment", json={"amount": "-5"}
    )

    assert response.status_code == 422
    assert response.json() == NEGATIVE
    payment = payment_of(db_session, appointment_id)
    assert payment is not None
    assert payment.amount == Decimal("35.00")


def test_rn41_correcao_vazia_e_recusada(
    api: TestClient, db_session: Session, edvaldo: int
) -> None:
    appointment_id = completed(api, db_session, edvaldo)

    for body in ({}, {"amount": None, "method": None}):
        response = api.patch(f"/admin/appointments/{appointment_id}/payment", json=body)
        assert response.status_code == 422
        assert response.json() == EMPTY_UPDATE


def test_rn41_forma_invalida_na_correcao_e_recusada(
    api: TestClient, db_session: Session, edvaldo: int
) -> None:
    appointment_id = completed(api, db_session, edvaldo)

    response = api.patch(
        f"/admin/appointments/{appointment_id}/payment", json={"method": "BOLETO"}
    )

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"


@pytest.mark.parametrize(
    "status",
    [
        AppointmentStatus.SCHEDULED,
        AppointmentStatus.CANCELED,
        AppointmentStatus.NO_SHOW,
    ],
)
def test_rn41_so_corrige_pagamento_de_atendimento_concluido(
    api: TestClient, db_session: Session, edvaldo: int, status: AppointmentStatus
) -> None:
    appointment = scheduled(db_session, edvaldo, status)

    response = api.patch(
        f"/admin/appointments/{appointment.id}/payment", json={"method": "CASH"}
    )

    assert response.status_code == 409
    assert response.json() == NOT_COMPLETED


# Detalhe e agenda.


def test_rn40_detalhe_e_agenda_trazem_o_pagamento_so_do_concluido(
    api: TestClient, db_session: Session, edvaldo: int
) -> None:
    done = completed(api, db_session, edvaldo)
    lauro = barber_id(db_session, "Lauro")
    pending = make_appointment(db_session, barber=lauro, starts_at=START)
    missed = make_appointment(
        db_session,
        barber=barber_id(db_session, "Manoel"),
        starts_at=START,
        status=AppointmentStatus.NO_SHOW,
    )

    detail = api.get(f"/admin/appointments/{done}").json()
    listed = api.get(
        "/admin/appointments", params={"start": "2026-11-03", "end": "2026-11-03"}
    ).json()["appointments"]

    assert detail["payment"] == {"amount": "35.00", "method": "PIX"}
    by_id = {item["id"]: item for item in listed}
    assert by_id[done] == detail
    assert by_id[pending.id]["payment"] is None
    assert by_id[pending.id]["closed_at"] is None
    assert by_id[missed.id]["payment"] is None
    assert by_id[missed.id]["closed_by"] == "admin@example.com"


# Acesso (RN-70).


def test_rn70_so_a_administracao_conclui_marca_falta_e_corrige(
    customer: TestClient, db_session: Session, edvaldo: int
) -> None:
    appointment = scheduled(db_session, edvaldo)
    base = f"/admin/appointments/{appointment.id}"

    for response in (
        customer.post(f"{base}/complete", json={"method": "PIX"}),
        customer.post(f"{base}/no-show"),
        customer.patch(f"{base}/payment", json={"method": "PIX"}),
    ):
        assert response.status_code == 403

    db_session.expire_all()
    assert db_session.get(Appointment, appointment.id).status == (  # type: ignore[union-attr]
        AppointmentStatus.SCHEDULED
    )


def test_rn70_sem_token_as_rotas_respondem_401(
    client: TestClient, db_session: Session, edvaldo: int
) -> None:
    appointment = scheduled(db_session, edvaldo)
    base = f"/admin/appointments/{appointment.id}"

    assert client.post(f"{base}/complete", json={"method": "PIX"}).status_code == 401
    assert client.post(f"{base}/no-show").status_code == 401
    assert client.patch(f"{base}/payment", json={"method": "PIX"}).status_code == 401


# O banco garante a coerência.


def test_rn33_banco_exige_quem_e_quando_no_concluido_e_na_falta(
    db_session: Session,
) -> None:
    for name, status in (
        ("Edvaldo", AppointmentStatus.COMPLETED),
        ("Lauro", AppointmentStatus.NO_SHOW),
    ):
        appointment = scheduled(db_session, barber_id(db_session, name))
        with pytest.raises(IntegrityError) as error, db_session.begin_nested():
            appointment.status = status
            db_session.flush()
        assert "ck_appointments_closing" in str(error.value)


def test_rn33_banco_recusa_fechamento_em_agendamento_ativo_ou_cancelado(
    db_session: Session, edvaldo: int
) -> None:
    for status in (AppointmentStatus.SCHEDULED, AppointmentStatus.CANCELED):
        appointment = scheduled(db_session, edvaldo, status)
        with pytest.raises(IntegrityError) as error, db_session.begin_nested():
            appointment.closed_at = START
            appointment.closed_by = ADMIN_EMAIL
            db_session.flush()
        assert "ck_appointments_closing" in str(error.value)


def test_rn33_banco_recusa_quem_sem_quando(db_session: Session, edvaldo: int) -> None:
    appointment = scheduled(db_session, edvaldo, AppointmentStatus.NO_SHOW)
    with pytest.raises(IntegrityError) as error, db_session.begin_nested():
        appointment.closed_by = None
        db_session.flush()
    assert "ck_appointments_closing" in str(error.value)


def test_rn40_banco_recusa_pagamento_invalido(
    db_session: Session, edvaldo: int
) -> None:
    appointment = scheduled(db_session, edvaldo, AppointmentStatus.COMPLETED)
    db_session.add(
        Payment(appointment_id=appointment.id, amount=Decimal("0"), method="PIX")
    )
    db_session.flush()  # cortesia (zero) é válida

    for payment in (
        Payment(appointment_id=appointment.id, amount=Decimal("1"), method="PIX"),
        Payment(
            appointment_id=scheduled(db_session, edvaldo).id,
            amount=Decimal("-1"),
            method="PIX",
        ),
    ):
        with pytest.raises(IntegrityError), db_session.begin_nested():
            db_session.add(payment)
            db_session.flush()

    other = scheduled(db_session, edvaldo, AppointmentStatus.COMPLETED)
    with pytest.raises(IntegrityError) as error, db_session.begin_nested():
        db_session.execute(
            text(
                "INSERT INTO payments (appointment_id, amount, method)"
                " VALUES (:id, 10, 'BOLETO')"
            ),
            {"id": other.id},
        )
    assert "ck_payments_method" in str(error.value)


# Concorrência: conexões próprias, como em test_appointments.py.


@dataclass(frozen=True)
class Seed:
    customer_id: int
    appointment_id: int


@pytest.fixture
def committed_appointment(migrated_engine: Engine) -> Iterator[Seed]:
    """Agendamento confirmado de verdade, para duas conexões disputarem. O que
    os testes gravam é apagado no fim, mesmo se o teste falhar."""
    with migrated_engine.begin() as connection:
        customer_id = connection.execute(
            text(
                "INSERT INTO customers (name, phone)"
                " VALUES ('Concorrência', '75900000001') RETURNING id"
            )
        ).scalar_one()
        barber = connection.execute(
            text("SELECT id FROM barbers WHERE name = 'Edvaldo'")
        ).scalar_one()
        service = connection.execute(
            select(Service.id).where(Service.name == "Corte + Barba")
        ).scalar_one()
        appointment_id = connection.execute(
            text(
                "INSERT INTO appointments (customer_id, barber_id, service_id,"
                " starts_at, ends_at, price, duration_minutes, status, source)"
                " VALUES (:customer, :barber, :service, :starts, :ends, 35, 45,"
                " 'SCHEDULED', 'ADMIN') RETURNING id"
            ),
            {
                "customer": customer_id,
                "barber": barber,
                "service": service,
                "starts": START,
                "ends": START + timedelta(minutes=45),
            },
        ).scalar_one()
    try:
        yield Seed(customer_id=customer_id, appointment_id=appointment_id)
    finally:
        with migrated_engine.begin() as connection:
            connection.execute(
                text("DELETE FROM payments WHERE appointment_id = :id"),
                {"id": appointment_id},
            )
            connection.execute(
                text("DELETE FROM appointments WHERE id = :id"),
                {"id": appointment_id},
            )
            connection.execute(
                text("DELETE FROM customers WHERE id = :id"), {"id": customer_id}
            )


@pytest.mark.parametrize("second", ["complete", "no-show"])
def test_rn31_duas_conclusoes_simultaneas_so_uma_vale(
    migrated_engine: Engine, committed_appointment: Seed, second: str
) -> None:
    """Dois pedidos juntos para o mesmo agendamento: a linha é travada e relida,
    então um conclui e o outro recebe `APPOINTMENT_NOT_ACTIVE`. Nunca dois
    pagamentos, nem uma conclusão e uma falta."""
    barrier = threading.Barrier(2, timeout=10)
    now = AFTER_START.astimezone(UTC)

    def close(action: str) -> str:
        with Session(migrated_engine) as session:
            session.execute(text("SET lock_timeout = '10s'"))
            barrier.wait()
            try:
                if action == "complete":
                    payments_service.complete_appointment(
                        session,
                        committed_appointment.appointment_id,
                        method=PaymentMethod.PIX,
                        amount=None,
                        admin_email=ADMIN_EMAIL,
                        now=now,
                    )
                else:
                    payments_service.mark_no_show(
                        session,
                        committed_appointment.appointment_id,
                        admin_email=ADMIN_EMAIL,
                        now=now,
                    )
            except DomainError as error:
                return error.code
            return "ok"

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(close, ["complete", second]))

    assert sorted(results) == ["APPOINTMENT_NOT_ACTIVE", "ok"]
    with migrated_engine.connect() as connection:
        payments = connection.execute(
            text("SELECT count(*) FROM payments WHERE appointment_id = :id"),
            {"id": committed_appointment.appointment_id},
        ).scalar_one()
        status = connection.execute(
            text("SELECT status FROM appointments WHERE id = :id"),
            {"id": committed_appointment.appointment_id},
        ).scalar_one()
    # Se a conclusão venceu, há um pagamento; se a falta venceu, nenhum.
    assert (status, payments) in {("COMPLETED", 1), ("NO_SHOW", 0)}
    assert (status == "COMPLETED") == (payments == 1)
