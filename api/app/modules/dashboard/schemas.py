"""Contrato HTTP do painel de indicadores (RN-45)."""

from datetime import date, datetime
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, PlainSerializer

from app.modules.catalog.schemas import Money


def _percent_text(value: Decimal) -> str:
    """Percentual na resposta: string decimal com uma casa ("12.5"), nunca float."""
    return f"{value:.1f}"


Percent = Annotated[Decimal, PlainSerializer(_percent_text, return_type=str)]


class PeriodIndicators(BaseModel):
    """RN-45: os números de um período (o mês até hoje, ou o mesmo trecho do
    mês anterior). `null` quando a conta não tem denominador."""

    start: date
    end: date
    revenue: Money
    completed_count: int
    no_show_count: int
    # Faltas sobre (concluídos + faltas), em %.
    no_show_rate: Percent | None
    # Faturamento sobre concluídos.
    average_ticket: Money | None


class IndicatorChanges(BaseModel):
    """RN-45: a variação do mês corrente sobre o mesmo trecho do anterior.
    `null` quando o anterior é zero (não há base para a variação)."""

    # Em %.
    revenue: Percent | None
    completed_count: Percent | None
    average_ticket: Percent | None
    # Em pontos percentuais (diferença entre as duas taxas).
    no_show_rate: Percent | None


class DailyRevenue(BaseModel):
    date: date
    revenue: Money
    completed_count: int


class OccupancyWindow(BaseModel):
    """RN-45: minutos ocupados sobre minutos de expediente livres de bloqueio."""

    start: date
    end: date
    booked_minutes: int
    available_minutes: int
    # Em %; `null` sem expediente na janela.
    rate: Percent | None


class BarberOccupancy(BaseModel):
    barber_id: int
    barber_name: str
    # Os 7 dias antes de hoje.
    past: OccupancyWindow
    # Hoje e os 6 dias seguintes.
    upcoming: OccupancyWindow


class PeakRow(BaseModel):
    # 0 = segunda … 6 = domingo, como `date.weekday()`.
    weekday: int
    # RN-02: o dia abre na semana atual.
    open: bool
    # Um número por hora de `PeakHours.hours`, na mesma ordem.
    counts: list[int]


class PeakHours(BaseModel):
    """RN-45: atendimentos por dia da semana e hora de início, em São Paulo."""

    start: date
    end: date
    # Horas cheias (0–23) da grade, em ordem.
    hours: list[int]
    rows: list[PeakRow]
    max_count: int


class TodayAppointment(BaseModel):
    id: int
    starts_at: datetime
    ends_at: datetime
    customer_name: str
    barber_name: str
    service_name: str
    # O horário já começou e ainda não terminou.
    in_progress: bool


class TodaySummary(BaseModel):
    date: date
    # Agendados, concluídos e faltas que começam hoje (não conta cancelados).
    total_count: int
    completed_count: int
    # Os `SCHEDULED` de hoje que ainda não terminaram, por início.
    upcoming: list[TodayAppointment]


class Dashboard(BaseModel):
    """O painel da administração. Datas no fuso de São Paulo (`-03:00`, RN-01);
    dinheiro e percentuais como string decimal (`"125.00"`, `"12.5"`)."""

    generated_at: datetime
    current: PeriodIndicators
    previous: PeriodIndicators
    changes: IndicatorChanges
    daily_revenue: list[DailyRevenue]
    occupancy: list[BarberOccupancy]
    peak_hours: PeakHours
    today: TodaySummary
