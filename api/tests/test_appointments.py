"""Tabela de agendamentos: garantias do banco (RN-08, RN-13, RN-30, RN-33)."""

import threading
from collections.abc import Iterator
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Connection, Engine, insert, select, text
from sqlalchemy.exc import DBAPIError, IntegrityError
from sqlalchemy.orm import Session

from app.errors import DomainError
from app.modules.appointments.models import (
    OVERLAP_CONSTRAINT,
    Appointment,
    AppointmentSource,
    AppointmentStatus,
)
from app.modules.appointments.service import is_slot_conflict
from app.modules.availability.service import ensure_slot_available
from app.modules.barbers.models import Barber
from app.modules.barbers.schemas import BarberUpdate
from app.modules.barbers.service import update_barber
from app.modules.catalog.models import Service
from tests.factories import (
    barber_id,
    local,
    make_appointment,
    make_customer,
    service_by_name,
)

TEN = local(2026, 11, 3, 10)


def violated_constraint(error: IntegrityError) -> str | None:
    return getattr(getattr(error.orig, "diag", None), "constraint_name", None)


@pytest.fixture
def edvaldo(db_session: Session) -> int:
    return barber_id(db_session, "Edvaldo")


def book(session: Session, barber: int, starts_at: datetime, minutes: int = 45) -> None:
    """Tenta gravar um agendamento num savepoint, para o teste seguir depois."""
    with session.begin_nested():
        make_appointment(
            session, barber=barber, starts_at=starts_at, duration_minutes=minutes
        )


@pytest.mark.parametrize(
    ("start", "minutes"),
    [
        ((10, 30), 30),  # começa no meio
        ((9, 30), 45),  # termina no meio
        ((10, 0), 45),  # mesmo horário
        ((10, 10), 10),  # dentro
        ((9, 30), 120),  # envolve
    ],
)
def test_rn08_banco_recusa_agendamentos_ativos_sobrepostos_do_mesmo_barbeiro(
    db_session: Session, edvaldo: int, start: tuple[int, int], minutes: int
) -> None:
    book(db_session, edvaldo, TEN)

    with pytest.raises(IntegrityError) as error:
        book(db_session, edvaldo, local(2026, 11, 3, *start), minutes)

    assert violated_constraint(error.value) == OVERLAP_CONSTRAINT


def test_rn08_encostar_no_fim_do_anterior_e_permitido(
    db_session: Session, edvaldo: int
) -> None:
    book(db_session, edvaldo, TEN)
    book(db_session, edvaldo, local(2026, 11, 3, 10, 45), 30)
    book(db_session, edvaldo, local(2026, 11, 3, 9, 30), 30)


def test_rn08_outro_barbeiro_pode_ter_o_mesmo_horario(
    db_session: Session, edvaldo: int
) -> None:
    book(db_session, edvaldo, TEN)
    book(db_session, barber_id(db_session, "Lauro"), TEN)


@pytest.mark.parametrize(
    "status",
    [
        AppointmentStatus.CANCELED,
        AppointmentStatus.COMPLETED,
        AppointmentStatus.NO_SHOW,
    ],
)
def test_rn08_rn32_agendamento_que_nao_esta_ativo_nao_ocupa(
    db_session: Session, edvaldo: int, status: AppointmentStatus
) -> None:
    make_appointment(db_session, barber=edvaldo, starts_at=TEN, status=status)

    book(db_session, edvaldo, TEN)


def test_rn08_voltar_a_ativo_num_horario_ocupado_e_recusado(
    db_session: Session, edvaldo: int
) -> None:
    old = make_appointment(
        db_session,
        barber=edvaldo,
        starts_at=TEN,
        status=AppointmentStatus.NO_SHOW,
    )
    book(db_session, edvaldo, TEN)

    with pytest.raises(IntegrityError) as error, db_session.begin_nested():
        old.status = AppointmentStatus.SCHEDULED
        old.closed_at = None  # RN-33: só concluído e falta registram o fechamento
        old.closed_by = None
        db_session.flush()

    assert violated_constraint(error.value) == OVERLAP_CONSTRAINT


@dataclass(frozen=True)
class Seed:
    customer_id: int
    barber_id: int
    service_id: int


@pytest.fixture
def committed_seed(migrated_engine: Engine) -> Iterator[Seed]:
    """Cliente confirmado de verdade, para transações em conexões próprias.

    Os testes de concorrência não usam a transação com rollback do `db_session`:
    cada conexão confirma ou desfaz a própria transação. Por isso tudo o que eles
    gravam é apagado aqui no fim, mesmo se o teste falhar.
    """
    with migrated_engine.begin() as connection:
        customer_id = connection.execute(
            text(
                "INSERT INTO customers (name, phone)"
                " VALUES ('Concorrência', '75900000000') RETURNING id"
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
                text("DELETE FROM customers WHERE id = :id"), {"id": customer_id}
            )


def insert_appointment(
    connection: Connection | Session, seed: Seed, starts_at: datetime
) -> None:
    connection.execute(
        insert(Appointment).values(
            customer_id=seed.customer_id,
            barber_id=seed.barber_id,
            service_id=seed.service_id,
            starts_at=starts_at,
            ends_at=starts_at + timedelta(minutes=45),
            price=Decimal("35.00"),
            duration_minutes=45,
            status=AppointmentStatus.SCHEDULED,
            source=AppointmentSource.ONLINE,
        )
    )


def scheduled_count(engine: Engine, seed: Seed) -> int:
    with engine.connect() as connection:
        return connection.execute(
            text("SELECT count(*) FROM appointments WHERE customer_id = :id"),
            {"id": seed.customer_id},
        ).scalar_one()


def test_rn08_concorrencia_so_uma_de_duas_reservas_simultaneas_e_aceita(
    migrated_engine: Engine, committed_seed: Seed
) -> None:
    """Duas conexões, cada uma na sua transação, reservam ao mesmo tempo
    horários que se cruzam (10h00 e 10h30, 45 min). Só uma confirma.

    Se as duas gravam no índice antes de conferir a outra, cada uma espera a
    outra e o Postgres desfaz uma delas com deadlock, em vez da violação. As
    duas formas são recusas: `is_slot_conflict` reconhece as duas, e a criação
    (S3.08) responde "horário não está mais disponível".
    """
    barrier = threading.Barrier(2, timeout=10)

    def reserve(starts_at: datetime) -> str:
        try:
            with migrated_engine.connect() as connection:
                with connection.begin():
                    connection.execute(text("SET LOCAL lock_timeout = '10s'"))
                    barrier.wait()  # as duas inserem juntas
                    insert_appointment(connection, committed_seed, starts_at)
            return "confirmada"
        except DBAPIError as error:
            return "recusada" if is_slot_conflict(error) else repr(error)

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(reserve, [TEN, local(2026, 11, 3, 10, 30)]))

    assert sorted(results) == ["confirmada", "recusada"]
    assert scheduled_count(migrated_engine, committed_seed) == 1


@pytest.mark.parametrize(
    ("first_outcome", "second_result"),
    [("commit", OVERLAP_CONSTRAINT), ("rollback", "confirmada")],
)
def test_rn08_concorrencia_segunda_reserva_espera_a_primeira(
    migrated_engine: Engine,
    committed_seed: Seed,
    first_outcome: str,
    second_result: str,
) -> None:
    """A segunda transação fica esperando a primeira. Se a primeira confirmar,
    a segunda é recusada; se a primeira desistir, a segunda fica com o horário."""
    results: list[str] = []

    def second() -> None:
        try:
            with migrated_engine.connect() as connection:
                with connection.begin():
                    connection.execute(text("SET LOCAL lock_timeout = '10s'"))
                    insert_appointment(
                        connection, committed_seed, local(2026, 11, 3, 10, 30)
                    )
            results.append("confirmada")
        except IntegrityError as error:
            assert is_slot_conflict(error)
            results.append(violated_constraint(error) or "outro erro")

    with migrated_engine.connect() as first:
        transaction = first.begin()
        insert_appointment(first, committed_seed, TEN)

        thread = threading.Thread(target=second)
        thread.start()
        thread.join(timeout=0.5)
        assert thread.is_alive(), "a segunda reserva deveria esperar a primeira"
        assert results == []

        if first_outcome == "commit":
            transaction.commit()
        else:
            transaction.rollback()
        thread.join(timeout=10)

    assert not thread.is_alive()
    assert results == [second_result]
    assert scheduled_count(migrated_engine, committed_seed) == 1


def test_rn60_rn08_inativacao_espera_a_criacao_em_andamento(
    migrated_engine: Engine, committed_seed: Seed
) -> None:
    """A criação trava o barbeiro (`FOR SHARE`) ao conferir o horário. A
    inativação espera essa transação e, depois dela, enxerga o novo agendamento
    e é recusada: o barbeiro nunca fica inativo com um agendamento futuro."""
    now = local(2026, 11, 2, 8)
    results: list[str] = []

    def deactivate() -> None:
        try:
            with Session(migrated_engine) as session:
                session.execute(text("SET LOCAL lock_timeout = '10s'"))
                update_barber(
                    session,
                    committed_seed.barber_id,
                    BarberUpdate(active=False),
                    now=now,
                )
            results.append("inativado")
        except DomainError as error:
            results.append(error.code)

    try:
        with Session(migrated_engine) as creation:
            ensure_slot_available(
                creation,
                barber_id=committed_seed.barber_id,
                service_id=committed_seed.service_id,
                starts_at=TEN,
                now=now,
            )
            thread = threading.Thread(target=deactivate)
            thread.start()
            thread.join(timeout=0.5)
            assert thread.is_alive(), "a inativação deveria esperar a criação"

            insert_appointment(creation, committed_seed, TEN)
            creation.commit()
        thread.join(timeout=10)

        assert not thread.is_alive()
        assert results == ["BARBER_HAS_FUTURE_APPOINTMENTS"]
    finally:
        with migrated_engine.begin() as connection:
            connection.execute(
                text("UPDATE barbers SET active = true WHERE id = :id"),
                {"id": committed_seed.barber_id},
            )


def test_rn13_preco_e_duracao_ficam_congelados_no_agendamento(
    admin: TestClient, db_session: Session, edvaldo: int
) -> None:
    service = service_by_name(db_session, "Corte + Barba")
    appointment = make_appointment(
        db_session,
        barber=edvaldo,
        starts_at=TEN,
        service=service,
        price=service.price,
        duration_minutes=service.duration_minutes,
    )

    response = admin.patch(
        f"/admin/services/{service.id}",
        json={"price": "50.00", "duration_minutes": 60},
    )
    assert response.status_code == 200, response.json()
    db_session.refresh(appointment)

    assert appointment.price == Decimal("35.00")
    assert appointment.duration_minutes == 45
    assert appointment.ends_at == local(2026, 11, 3, 10, 45)


def insert_raw(session: Session, **changes: object) -> None:
    """INSERT direto, para provar as `CHECK`s sem passar pelo ORM."""
    values: dict[str, object] = {
        "customer_id": make_customer(session).id,
        "barber_id": barber_id(session, "Lauro"),
        "service_id": service_by_name(session, "Corte + Barba").id,
        "starts_at": TEN,
        "ends_at": TEN + timedelta(minutes=45),
        "price": Decimal("35.00"),
        "duration_minutes": 45,
        "status": "SCHEDULED",
        "source": "ONLINE",
        "canceled_at": None,
        "canceled_by": None,
    } | changes
    columns = ", ".join(values)
    params = ", ".join(f":{column}" for column in values)
    with session.begin_nested():
        session.execute(
            text(f"INSERT INTO appointments ({columns}) VALUES ({params})"), values
        )


@pytest.mark.parametrize(
    ("changes", "constraint"),
    [
        ({"price": Decimal("-1")}, "ck_appointments_price_non_negative"),
        ({"duration_minutes": 0, "ends_at": TEN}, "ck_appointments_duration"),
        ({"ends_at": TEN + timedelta(minutes=30)}, "ck_appointments_ends_at"),
    ],
)
def test_rn13_banco_recusa_preco_duracao_e_fim_incoerentes(
    db_session: Session, changes: dict[str, object], constraint: str
) -> None:
    with pytest.raises(IntegrityError) as error:
        insert_raw(db_session, **changes)

    assert violated_constraint(error.value) == constraint
    assert not is_slot_conflict(error.value)


def test_rn30_rn12_agendamento_nasce_agendado(db_session: Session) -> None:
    customer = make_customer(db_session).id
    db_session.execute(
        text(
            "INSERT INTO appointments (customer_id, barber_id, service_id,"
            " starts_at, ends_at, price, duration_minutes, source)"
            " VALUES (:customer, :barber, :service, :starts, :ends, 35, 45, 'ADMIN')"
        ),
        {
            "customer": customer,
            "barber": barber_id(db_session, "Lauro"),
            "service": service_by_name(db_session, "Corte + Barba").id,
            "starts": TEN,
            "ends": TEN + timedelta(minutes=45),
        },
    )

    status = db_session.scalar(
        select(Appointment.status).where(
            Appointment.barber_id == barber_id(db_session, "Lauro")
        )
    )
    assert status == AppointmentStatus.SCHEDULED


@pytest.mark.parametrize(
    ("changes", "constraint"),
    [
        ({"status": "PENDENTE"}, "ck_appointments_status"),
        ({"source": "TELEFONE"}, "ck_appointments_source"),
    ],
)
def test_rn30_banco_aceita_so_os_status_e_origens_conhecidos(
    db_session: Session, changes: dict[str, object], constraint: str
) -> None:
    with pytest.raises(IntegrityError) as error:
        insert_raw(db_session, **changes)

    assert violated_constraint(error.value) == constraint


@pytest.mark.parametrize(
    ("changes", "constraint"),
    [
        ({"status": "CANCELED"}, "ck_appointments_cancellation"),
        (
            {"status": "CANCELED", "canceled_at": TEN},
            "ck_appointments_cancellation",
        ),
        (
            {"canceled_at": TEN, "canceled_by": "ADMIN"},
            "ck_appointments_cancellation",
        ),
        (
            {"status": "CANCELED", "canceled_at": TEN, "canceled_by": "BARBEIRO"},
            "ck_appointments_canceled_by",
        ),
    ],
)
def test_rn33_cancelamento_registra_quando_e_quem(
    db_session: Session, changes: dict[str, object], constraint: str
) -> None:
    with pytest.raises(IntegrityError) as error:
        insert_raw(db_session, **changes)

    assert violated_constraint(error.value) == constraint


@pytest.mark.parametrize("canceled_by", ["CUSTOMER", "ADMIN"])
def test_rn33_cancelamento_completo_e_aceito(
    db_session: Session, canceled_by: str
) -> None:
    insert_raw(db_session, status="CANCELED", canceled_at=TEN, canceled_by=canceled_by)
