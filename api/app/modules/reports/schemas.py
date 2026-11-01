"""Contrato HTTP do relatório financeiro (RN-43)."""

from datetime import date, datetime

from pydantic import BaseModel

from app.modules.agenda.schemas import AgendaBarber, AgendaService
from app.modules.catalog.schemas import Money
from app.modules.payments.models import PaymentMethod


class ReportCustomer(BaseModel):
    id: int
    name: str


class ReportBarber(BaseModel):
    id: int
    name: str


class BarberTotal(BaseModel):
    """RN-42: o que o barbeiro faturou no período e as faltas dos clientes dele."""

    barber: AgendaBarber
    total: Money
    completed_count: int
    no_show_count: int


class MethodTotal(BaseModel):
    """RN-43: o que entrou por uma forma de pagamento."""

    method: PaymentMethod
    total: Money
    count: int


class CompletedAppointment(BaseModel):
    """Um atendimento concluído. `amount` é o valor cobrado (RN-40), não o preço."""

    appointment_id: int
    starts_at: datetime
    customer: ReportCustomer
    barber: ReportBarber
    service: AgendaService
    amount: Money
    method: PaymentMethod


class FinancialReport(BaseModel):
    """O relatório do período. Datas no fuso de São Paulo (`-03:00`, RN-01);
    dinheiro como string decimal com duas casas (`"125.00"`)."""

    start: date
    end: date
    # `null` = todos os barbeiros.
    barber_id: int | None
    # RN-43: faturamento total e quantidade de atendimentos concluídos.
    total: Money
    completed_count: int
    # RN-43: faltas no período.
    no_show_count: int
    # Por nome. Sem filtro, os ativos e os inativos com atendimento no período.
    by_barber: list[BarberTotal]
    # Sempre as quatro formas, na ordem CASH, PIX, DEBIT, CREDIT.
    by_method: list[MethodTotal]
    # Por início, nome do barbeiro e id.
    completed: list[CompletedAppointment]
