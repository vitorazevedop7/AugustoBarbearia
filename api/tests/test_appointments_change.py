"""RN-14: até quando o cliente altera e quando é em cima da hora (D16)."""

from datetime import timedelta

import pytest

from app.modules.appointments.models import (
    Appointment,
    AppointmentStatus,
    CanceledBy,
)
from app.modules.appointments.service import (
    can_change_at,
    is_late_cancellation,
    is_late_change,
)
from tests.factories import local

START = local(2026, 11, 3, 10)


@pytest.mark.parametrize(
    ("before", "can", "late"),
    [
        (timedelta(hours=3), True, False),
        (timedelta(hours=2), True, False),
        (timedelta(hours=1, minutes=59), True, True),
        (timedelta(seconds=1), True, True),
        (timedelta(0), False, False),
        (timedelta(minutes=-5), False, False),
    ],
)
def test_rn14_prazo_vai_ate_o_inicio_e_as_2h_sao_em_cima_da_hora(
    before: timedelta, can: bool, late: bool
) -> None:
    now = START - before

    assert can_change_at(START, now) is can
    assert is_late_change(START, now) is late


@pytest.mark.parametrize(
    ("canceled_before", "by", "late"),
    [
        (timedelta(minutes=30), CanceledBy.CUSTOMER, True),
        (timedelta(hours=3), CanceledBy.CUSTOMER, False),
        (timedelta(minutes=30), CanceledBy.ADMIN, False),
    ],
)
def test_rn14_rn33_cancelamento_em_cima_da_hora_e_so_o_do_cliente(
    canceled_before: timedelta, by: CanceledBy, late: bool
) -> None:
    appointment = Appointment(
        starts_at=START,
        status=AppointmentStatus.CANCELED,
        canceled_at=START - canceled_before,
        canceled_by=by,
    )

    assert is_late_cancellation(appointment) is late
