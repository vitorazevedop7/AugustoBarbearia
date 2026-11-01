"""Cálculo puro dos horários (RN-05): sem banco, sem relógio."""

from datetime import UTC, date, datetime, time, timedelta

import pytest

from app.modules.availability.slots import (
    ADMIN_POLICY,
    CUSTOMER_POLICY,
    BookingPolicy,
    Offer,
    OpeningHours,
    TimeRange,
    available_slots,
)
from tests.factories import local

MONDAY = date(2026, 11, 2)
SATURDAY = date(2026, 11, 7)
WEEKDAY_HOURS = OpeningHours(opens_at=time(10), closes_at=time(19))
SATURDAY_HOURS = OpeningHours(opens_at=time(9), closes_at=time(14))
# Véspera, à tarde: a antecedência não interfere nos casos que não a testam.
EVE = local(2026, 11, 1, 15)
NO_LIMITS = BookingPolicy(min_notice=None, max_days_ahead=None)


def offer(minutes: int, **changes: bool) -> Offer:
    flags = {
        "barber_active": True,
        "service_active": True,
        "barber_performs_service": True,
    } | changes
    return Offer(duration=timedelta(minutes=minutes), **flags)


def slots(
    *,
    day: date = MONDAY,
    hours: OpeningHours | None = WEEKDAY_HOURS,
    minutes: int = 30,
    busy: tuple[TimeRange, ...] = (),
    now: datetime = EVE,
    policy: BookingPolicy = CUSTOMER_POLICY,
    **changes: bool,
) -> list[TimeRange]:
    return available_slots(
        day=day,
        hours=hours,
        offer=offer(minutes, **changes),
        busy=busy,
        now=now,
        policy=policy,
    )


def starts(result: list[TimeRange]) -> list[str]:
    """Inícios em hora local, para ler os testes como a agenda da barbearia."""
    return [slot.start.strftime("%H:%M") for slot in result]


def grid(first: str, last: str) -> list[str]:
    """Todos os inícios de 30 em 30 minutos entre `first` e `last`."""
    current = datetime.strptime(first, "%H:%M")
    end = datetime.strptime(last, "%H:%M")
    result: list[str] = []
    while current <= end:
        result.append(current.strftime("%H:%M"))
        current += timedelta(minutes=30)
    return result


def busy_local(start: tuple[int, int], end: tuple[int, int]) -> TimeRange:
    return TimeRange(local(2026, 11, 2, *start), local(2026, 11, 2, *end))


def test_rn05_exemplo_corte_e_barba_as_10h_proximo_inicio_as_11h() -> None:
    result = slots(minutes=45, busy=(busy_local((10, 0), (10, 45)),))

    assert starts(result) == grid("11:00", "18:00")
    assert "10:00" not in starts(result)
    assert "10:30" not in starts(result)


def test_rn05_horario_antes_de_um_agendamento_nao_invade_o_inicio_dele() -> None:
    result = slots(minutes=45, busy=(busy_local((11, 0), (11, 30)),))

    assert starts(result)[:3] == ["10:00", "11:30", "12:00"]


def test_rn05_encostar_no_fim_do_agendamento_e_permitido() -> None:
    result = slots(minutes=30, busy=(busy_local((10, 0), (10, 30)),))

    assert starts(result)[0] == "10:30"


def test_rn05_rn03_intervalos_ocupados_genericos_somam_agendamentos_e_bloqueios() -> (
    None
):
    lunch_block = busy_local((12, 0), (13, 0))
    appointment = busy_local((15, 0), (15, 45))

    result = slots(minutes=60, busy=(lunch_block, appointment))

    assert starts(result) == [
        "10:00",
        "10:30",
        "11:00",
        "13:00",
        "13:30",
        "14:00",
        "16:00",
        "16:30",
        "17:00",
        "17:30",
        "18:00",
    ]


def test_rn05_cada_horario_traz_o_fim_do_atendimento() -> None:
    first = slots(minutes=45)[0]

    assert first == TimeRange(local(2026, 11, 2, 10), local(2026, 11, 2, 10, 45))


def test_rn04_grade_de_30_minutos_a_partir_da_abertura() -> None:
    assert starts(slots(minutes=30)) == grid("10:00", "18:30")


def test_rn04_grade_comeca_na_abertura_mesmo_fora_da_hora_cheia() -> None:
    hours = OpeningHours(opens_at=time(9, 15), closes_at=time(12))

    assert starts(slots(hours=hours, minutes=30)) == [
        "09:15",
        "09:45",
        "10:15",
        "10:45",
        "11:15",
    ]


def test_rn02_ultimo_horario_termina_ate_o_fechamento() -> None:
    corte_e_barba = slots(day=SATURDAY, hours=SATURDAY_HOURS, minutes=45)
    corte = slots(day=SATURDAY, hours=SATURDAY_HOURS, minutes=30)

    assert starts(corte_e_barba) == grid("09:00", "13:00")
    assert corte_e_barba[-1].end == local(2026, 11, 7, 13, 45)
    assert starts(corte) == grid("09:00", "13:30")
    assert corte[-1].end == local(2026, 11, 7, 14)


def test_rn02_servico_maior_que_o_expediente_nao_tem_horario() -> None:
    assert slots(day=SATURDAY, hours=SATURDAY_HOURS, minutes=330) == []


def test_rn02_dia_fechado_nao_tem_horario() -> None:
    assert slots(day=date(2026, 11, 8), hours=None) == []


def test_rn06_antecedencia_minima_de_1_hora() -> None:
    result = slots(now=local(2026, 11, 2, 10, 10))

    assert starts(result)[0] == "11:30"


def test_rn06_inicio_exatamente_1_hora_depois_e_oferecido() -> None:
    result = slots(now=local(2026, 11, 2, 10))

    assert starts(result)[0] == "11:00"


def test_rn06_pouco_antes_do_fechamento_nao_sobra_horario() -> None:
    assert slots(now=local(2026, 11, 2, 17, 31)) == []


def test_rn06_rn07_dia_que_ja_passou_nao_tem_horario() -> None:
    assert slots(day=MONDAY, now=local(2026, 11, 3, 8)) == []


def test_rn07_janela_de_30_dias_inclui_o_ultimo_dia_inteiro() -> None:
    now = local(2026, 10, 3, 18)  # 30 dias antes da segunda, 2/11

    result = slots(day=MONDAY, now=now)

    assert starts(result) == grid("10:00", "18:30")


def test_rn07_dia_31_fica_fora_da_janela() -> None:
    now = local(2026, 10, 2, 18)  # 31 dias antes da segunda, 2/11

    assert slots(day=MONDAY, now=now) == []


def test_rn07_rn01_janela_conta_o_dia_de_sao_paulo_e_nao_o_de_utc() -> None:
    # 3/10 às 23h30 em São Paulo já é 4/10 em UTC. "Hoje" continua sendo 3/10,
    # então 2/11 é o dia 30 (dentro) e 3/11 é o dia 31 (fora).
    now = local(2026, 10, 3, 23, 30).astimezone(UTC)
    assert now.date() == date(2026, 10, 4)

    assert slots(day=MONDAY, now=now) != []
    assert slots(day=date(2026, 11, 3), now=now) == []


def test_rn01_horarios_saem_no_fuso_de_sao_paulo() -> None:
    first = slots()[0]

    assert first.start.isoformat() == "2026-11-02T10:00:00-03:00"
    assert first.start == datetime(2026, 11, 2, 13, tzinfo=UTC)


def test_rn01_agendamento_em_utc_ocupa_o_horario_local_certo() -> None:
    # 13h00–13h45 UTC = 10h00–10h45 em São Paulo.
    busy = TimeRange(
        datetime(2026, 11, 2, 13, tzinfo=UTC), datetime(2026, 11, 2, 13, 45, tzinfo=UTC)
    )

    assert starts(slots(minutes=45, busy=(busy,)))[0] == "11:00"


def test_rn01_antecedencia_compara_instantes_em_qualquer_fuso() -> None:
    now = datetime(2026, 11, 2, 13, 10, tzinfo=UTC)  # 10h10 em São Paulo

    assert starts(slots(now=now))[0] == "11:30"


def test_rn01_usa_as_regras_de_fuso_do_dia_consultado() -> None:
    # Em 2018, São Paulo tinha horário de verão (-02:00) a partir de 4/11.
    result = slots(
        day=date(2018, 11, 5), now=datetime(2018, 11, 4, tzinfo=UTC), policy=NO_LIMITS
    )

    assert result[0].start.isoformat() == "2018-11-05T10:00:00-02:00"
    assert result[0].start == datetime(2018, 11, 5, 12, tzinfo=UTC)
    assert starts(result) == grid("10:00", "18:30")


@pytest.mark.parametrize(
    "change",
    [
        {"barber_active": False},
        {"service_active": False},
        {"barber_performs_service": False},
    ],
)
def test_rn05_item5_barbeiro_e_servico_ativos_e_barbeiro_realiza(
    change: dict[str, bool],
) -> None:
    assert slots(**change) == []


def test_politica_sem_limites_nao_aplica_antecedencia_nem_janela() -> None:
    now = local(2026, 11, 2, 15)

    assert starts(slots(now=now, policy=NO_LIMITS)) == grid("10:00", "18:30")
    assert slots(day=date(2027, 6, 7), now=now, policy=NO_LIMITS) != []


def test_rn21_rn04_politica_da_administracao_oferece_a_grade_de_hoje_inteira() -> None:
    """Às 14h10, a administração vê a grade de hoje inteira que está livre,
    inclusive 14h00, que já começou, e nada fora da grade (RN-04)."""
    now = local(2026, 11, 2, 14, 10)

    result = starts(slots(now=now, policy=ADMIN_POLICY))

    assert result == grid("10:00", "18:30")
    assert "14:10" not in result
    assert slots(day=date(2027, 6, 7), now=now, policy=ADMIN_POLICY) != []


def test_dia_que_ja_passou_nao_tem_horario_em_nenhuma_politica() -> None:
    now = local(2026, 11, 3, 0, 5)

    for policy in (CUSTOMER_POLICY, ADMIN_POLICY, NO_LIMITS):
        assert slots(day=MONDAY, now=now, policy=policy) == []


def test_rn01_recusa_horario_sem_fuso() -> None:
    with pytest.raises(ValueError):
        slots(now=datetime(2026, 11, 1, 15))
    with pytest.raises(ValueError):
        TimeRange(datetime(2026, 11, 2, 10), datetime(2026, 11, 2, 11))


def test_intervalo_precisa_terminar_depois_de_comecar() -> None:
    with pytest.raises(ValueError):
        TimeRange(local(2026, 11, 2, 10), local(2026, 11, 2, 10))
