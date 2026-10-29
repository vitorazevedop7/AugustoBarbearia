"""Fuso e relógio do sistema (RN-01)."""

from datetime import UTC, datetime
from zoneinfo import ZoneInfo

# RN-01: todas as datas e horas do negócio estão no fuso de São Paulo.
TIMEZONE = ZoneInfo("America/Sao_Paulo")


def utc_now() -> datetime:
    """Momento atual com fuso. Nas rotas, entra como dependência para os testes
    poderem fixar o relógio."""
    return datetime.now(UTC)
