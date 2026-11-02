"""RN-02 × RN-05: o expediente não abandona agendamentos futuros (#105)."""

import threading
from collections.abc import Iterator
from concurrent.futures import ThreadPoolExecutor, TimeoutError
from dataclasses import dataclass
from datetime import UTC, datetime, time

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, event, select, text
from sqlalchemy.orm import Session

from app.auth.dependencies import current_user
from app.auth.schemas import CurrentUser
from app.clock import utc_now
from app.db import get_session
from app.errors import DomainError
from app.main import create_app
from app.modules.admin_booking.service import (
    create_admin_appointment,
    reschedule_admin_appointment,
)
from app.modules.appointments.models import Appointment, AppointmentStatus
from app.modules.booking.service import (
    create_customer_appointment,
    reschedule_customer_appointment,
)
from app.modules.customers.models import Customer
from app.modules.notifications.models import Notification
from app.modules.shop.models import BusinessHours
from app.modules.shop.schemas import BusinessHoursDay
from app.modules.shop.service import update_business_hours
from tests.factories import barber_id, local, make_appointment, make_customer
from tests.test_shop import WEEK

NOW = local(2026, 11, 2, 8)
TARGET = local(2026, 11, 3, 10)
CONFLICT = {
    "code": "BUSINESS_HOURS_CONFLICT",
    "message": (
        "Há agendamentos futuros fora do novo horário de funcionamento. "
        "Remarque esses agendamentos antes de alterar o horário."
    ),
}


def changed_week(
    weekday: int = 0, opens_at: str | None = None, closes_at: str | None = None
) -> list[dict[str, object]]:
    week: list[dict[str, object]] = [*WEEK]
    week[weekday] = {
        "weekday": weekday,
        "opens_at": opens_at,
        "closes_at": closes_at,
    }
    return week


@pytest.fixture
def admin(db_session: Session) -> Iterator[TestClient]:
    app = create_app()
    app.dependency_overrides[get_session] = lambda: db_session
    app.dependency_overrides[utc_now] = lambda: NOW.astimezone(UTC)
    app.dependency_overrides[current_user] = lambda: CurrentUser(
        sub="admin", email="admin@example.com", name="Admin", role="admin"
    )
    with TestClient(app) as client:
        yield client


@pytest.mark.parametrize(
    ("opens_at", "closes_at"),
    [(None, None), ("10:30", "19:00"), ("10:00", "10:30")],
    ids=["fechar-dia", "abrir-depois-do-inicio", "fechar-antes-do-fim"],
)
def test_rn02_rn05_recusa_expediente_que_nao_comporta_o_intervalo_congelado(
    admin: TestClient,
    db_session: Session,
    opens_at: str | None,
    closes_at: str | None,
) -> None:
    appointment = make_appointment(
        db_session,
        barber=barber_id(db_session, "Edvaldo"),
        starts_at=local(2026, 11, 2, 10),
    )
    # A duração atual de 30 minutos não encurta os 45 já reservados (RN-13).
    db_session.execute(
        text("UPDATE services SET duration_minutes = 30 WHERE id = :id"),
        {"id": appointment.service_id},
    )
    week = changed_week(opens_at=opens_at, closes_at=closes_at)
    week[5] = {"weekday": 5, "opens_at": None, "closes_at": None}

    response = admin.put("/admin/business-hours", json=week)

    assert response.status_code == 409
    assert response.json() == CONFLICT
    # A semana inteira fica como estava, inclusive um dia sem conflito.
    assert admin.get("/public/shop").json()["business_hours"] == WEEK
    db_session.refresh(appointment)
    assert appointment.starts_at == local(2026, 11, 2, 10)
    assert appointment.duration_minutes == 45


def test_rn02_intervalo_que_encosta_na_abertura_e_no_fechamento_e_aceito(
    admin: TestClient, db_session: Session
) -> None:
    make_appointment(
        db_session,
        barber=barber_id(db_session, "Edvaldo"),
        starts_at=local(2026, 11, 2, 10),
    )
    week = changed_week(opens_at="10:00", closes_at="10:45")

    response = admin.put("/admin/business-hours", json=week)

    assert response.status_code == 200
    assert response.json()[0]["closes_at"] == "10:45:00"


@pytest.mark.parametrize(
    "status",
    [
        AppointmentStatus.CANCELED,
        AppointmentStatus.COMPLETED,
        AppointmentStatus.NO_SHOW,
    ],
)
def test_rn02_rn30_status_final_nao_impede_mudanca_de_expediente(
    admin: TestClient, db_session: Session, status: AppointmentStatus
) -> None:
    make_appointment(
        db_session,
        barber=barber_id(db_session, "Edvaldo"),
        starts_at=local(2026, 11, 2, 10),
        status=status,
    )

    assert admin.put("/admin/business-hours", json=changed_week()).status_code == 200


@pytest.mark.parametrize(
    "starts_at", [local(2026, 10, 26, 10), NOW, local(2026, 11, 2, 7, 30)]
)
def test_rn02_agendamento_que_ja_comecou_nao_impede_mudanca(
    admin: TestClient, db_session: Session, starts_at: datetime
) -> None:
    make_appointment(
        db_session, barber=barber_id(db_session, "Edvaldo"), starts_at=starts_at
    )

    assert admin.put("/admin/business-hours", json=changed_week()).status_code == 200


def test_rn02_confere_todos_os_barbeiros_e_sem_janela_de_30_dias(
    admin: TestClient, db_session: Session
) -> None:
    make_appointment(
        db_session,
        barber=barber_id(db_session, "Manoel"),
        starts_at=local(2027, 1, 4, 10),
    )

    response = admin.put("/admin/business-hours", json=changed_week())

    assert response.status_code == 409
    assert response.json() == CONFLICT


def test_rn01_rn02_dia_local_da_reserva_pode_ser_diferente_do_dia_utc(
    admin: TestClient, db_session: Session
) -> None:
    # Segunda-feira 23h de São Paulo já é terça em UTC.
    monday = db_session.get(BusinessHours, 0)
    assert monday is not None
    monday.opens_at, monday.closes_at = time(22), time(23, 59)
    db_session.flush()
    make_appointment(
        db_session,
        barber=barber_id(db_session, "Edvaldo"),
        starts_at=local(2026, 11, 2, 23),
    )
    week = changed_week(weekday=1)
    week[0] = {"weekday": 0, "opens_at": "22:00", "closes_at": "23:59"}

    # Fechar a terça não afeta esse agendamento.
    assert admin.put("/admin/business-hours", json=week).status_code == 200
    week[0] = {"weekday": 0, "opens_at": None, "closes_at": None}
    response = admin.put("/admin/business-hours", json=week)
    assert response.status_code == 409
    assert response.json() == CONFLICT


def test_rn01_rn02_fim_no_dia_seguinte_nao_cabe_no_expediente_do_inicio(
    admin: TestClient, db_session: Session
) -> None:
    make_appointment(
        db_session,
        barber=barber_id(db_session, "Edvaldo"),
        starts_at=local(2026, 11, 2, 23, 30),
        duration_minutes=60,
    )

    response = admin.put(
        "/admin/business-hours", json=changed_week(opens_at="00:00", closes_at="23:59")
    )

    assert response.status_code == 409
    assert response.json() == CONFLICT


# Transações reais, em conexões próprias: cliente/admin × criar/remarcar × duas ordens.


@dataclass(frozen=True)
class Seed:
    customer_id: int
    barber_id: int
    service_id: int
    appointment_id: int


@pytest.fixture
def committed_seed(migrated_engine: Engine) -> Iterator[Seed]:
    with Session(migrated_engine) as session:
        customer = make_customer(session)
        appointment = make_appointment(
            session,
            customer=customer,
            barber=barber_id(session, "Edvaldo"),
            starts_at=local(2026, 11, 2, 12),
        )
        seed = Seed(
            customer.id, appointment.barber_id, appointment.service_id, appointment.id
        )
        original_hours = [
            BusinessHoursDay(
                weekday=row.weekday, opens_at=row.opens_at, closes_at=row.closes_at
            )
            for row in session.scalars(select(BusinessHours)).all()
        ]
        session.commit()
    try:
        yield seed
    finally:
        with migrated_engine.begin() as connection:
            connection.execute(
                text(
                    "DELETE FROM notifications WHERE appointment_id IN ("
                    "SELECT id FROM appointments WHERE customer_id = :id)"
                ),
                {"id": seed.customer_id},
            )
            connection.execute(
                text("DELETE FROM appointments WHERE customer_id = :id"),
                {"id": seed.customer_id},
            )
            connection.execute(
                text("DELETE FROM customers WHERE id = :id"), {"id": seed.customer_id}
            )
            for day in original_hours:
                connection.execute(
                    text(
                        "UPDATE business_hours SET opens_at = :opens,"
                        " closes_at = :closes WHERE weekday = :weekday"
                    ),
                    {
                        "opens": day.opens_at,
                        "closes": day.closes_at,
                        "weekday": day.weekday,
                    },
                )


class NoEmailOutbox:
    def send_after_commit(self, notification: Notification | None) -> None:
        assert notification is None


def reserve(session: Session, seed: Seed, actor: str, action: str) -> str:
    try:
        if action == "create":
            if actor == "customer":
                customer = session.get(Customer, seed.customer_id)
                assert customer is not None
                create_customer_appointment(
                    session,
                    customer,
                    barber_id=seed.barber_id,
                    service_id=seed.service_id,
                    starts_at=TARGET,
                    now=NOW,
                    outbox=NoEmailOutbox(),
                )
            else:
                create_admin_appointment(
                    session,
                    customer_id=seed.customer_id,
                    new_customer=None,
                    barber_id=seed.barber_id,
                    service_id=seed.service_id,
                    starts_at=TARGET,
                    now=NOW,
                    outbox=NoEmailOutbox(),
                )
        elif actor == "customer":
            reschedule_customer_appointment(
                session,
                seed.customer_id,
                seed.appointment_id,
                barber_id=None,
                starts_at=TARGET,
                now=NOW,
                outbox=NoEmailOutbox(),
            )
        else:
            reschedule_admin_appointment(
                session,
                seed.appointment_id,
                barber_id=None,
                starts_at=TARGET,
                now=NOW,
                outbox=NoEmailOutbox(),
            )
        return "reservado"
    except DomainError as error:
        return error.code


def close_tuesday(session: Session) -> str:
    try:
        update_business_hours(
            session,
            [BusinessHoursDay.model_validate(day) for day in changed_week(weekday=1)],
            now=NOW,
        )
        return "fechado"
    except DomainError as error:
        return error.code


def hold_commit(
    session: Session, ready: threading.Event, release: threading.Event
) -> None:
    def wait(_session: Session) -> None:
        ready.set()
        assert release.wait(timeout=10)

    event.listen(session, "before_commit", wait, once=True)


@pytest.mark.parametrize("actor", ["customer", "admin"])
@pytest.mark.parametrize("action", ["create", "reschedule"])
def test_rn02_rn05_edicao_espera_criacao_ou_remarcacao_e_recusa_conflito(
    migrated_engine: Engine, committed_seed: Seed, actor: str, action: str
) -> None:
    ready, release, editing_started = (
        threading.Event(),
        threading.Event(),
        threading.Event(),
    )

    def booking() -> str:
        with Session(migrated_engine) as session:
            session.execute(text("SET LOCAL lock_timeout = '5s'"))
            hold_commit(session, ready, release)
            return reserve(session, committed_seed, actor, action)

    def editing() -> str:
        with Session(migrated_engine) as session:
            session.execute(text("SET LOCAL lock_timeout = '5s'"))
            editing_started.set()
            return close_tuesday(session)

    with ThreadPoolExecutor(max_workers=2) as pool:
        reservation = pool.submit(booking)
        try:
            assert ready.wait(timeout=10)
            edition = pool.submit(editing)
            assert editing_started.wait(timeout=10)
            with pytest.raises(TimeoutError):
                edition.result(timeout=0.5)
        finally:
            release.set()
        assert reservation.result(timeout=10) == "reservado"
        assert edition.result(timeout=10) == CONFLICT["code"]
    with Session(migrated_engine) as session:
        assert session.get(BusinessHours, 1).opens_at == time(10)
        assert (
            session.scalar(
                select(Appointment.id).where(Appointment.starts_at == TARGET)
            )
            is not None
        )


@pytest.mark.parametrize("actor", ["customer", "admin"])
@pytest.mark.parametrize("action", ["create", "reschedule"])
def test_rn02_rn05_reserva_espera_edicao_e_rele_expediente_ja_carregado(
    migrated_engine: Engine, committed_seed: Seed, actor: str, action: str
) -> None:
    loaded, begin, ready, release = (threading.Event() for _ in range(4))

    def booking() -> str:
        with Session(migrated_engine) as session:
            session.execute(text("SET LOCAL lock_timeout = '5s'"))
            # Mantém referências no identity map: a trava deve reler o dia após esperar.
            preloaded = session.scalars(
                select(BusinessHours).order_by(BusinessHours.weekday)
            ).all()
            assert preloaded[1].opens_at == time(10)
            loaded.set()
            assert begin.wait(timeout=10)
            return reserve(session, committed_seed, actor, action)

    def editing() -> str:
        with Session(migrated_engine) as session:
            session.execute(text("SET LOCAL lock_timeout = '5s'"))
            hold_commit(session, ready, release)
            return close_tuesday(session)

    with ThreadPoolExecutor(max_workers=2) as pool:
        reservation = pool.submit(booking)
        try:
            assert loaded.wait(timeout=10)
            edition = pool.submit(editing)
            assert ready.wait(timeout=10)
            begin.set()
            with pytest.raises(TimeoutError):
                reservation.result(timeout=0.5)
        finally:
            begin.set()
            release.set()
        assert edition.result(timeout=10) == "fechado"
        assert reservation.result(timeout=10) == "SLOT_UNAVAILABLE"
    with Session(migrated_engine) as session:
        assert session.get(BusinessHours, 1).opens_at is None
        assert (
            session.scalar(
                select(Appointment.id).where(Appointment.starts_at == TARGET)
            )
            is None
        )
        assert session.get(
            Appointment, committed_seed.appointment_id
        ).starts_at == local(2026, 11, 2, 12)
