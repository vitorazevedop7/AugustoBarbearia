"""Rota `/admin/reports/financial`: o relatório financeiro (RN-43, RN-70)."""

import datetime as dt
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.dependencies import require_admin
from app.clock import TIMEZONE
from app.db import get_session
from app.errors import ErrorResponse
from app.ids import Id
from app.modules.agenda.schemas import AgendaBarber, AgendaService
from app.modules.reports import service
from app.modules.reports.schemas import (
    BarberTotal,
    CompletedAppointment,
    FinancialReport,
    MethodTotal,
    ReportBarber,
    ReportCustomer,
)

router = APIRouter(
    prefix="/admin/reports",
    tags=["Relatório"],
    dependencies=[Depends(require_admin)],
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
    },
)

SessionDep = Annotated[Session, Depends(get_session)]


@router.get("/financial", response_model=FinancialReport)
def financial_report(
    start: Annotated[dt.date, Query(description="Data local de São Paulo.")],
    end: Annotated[dt.date, Query(description="Data local de São Paulo, inclusiva.")],
    session: SessionDep,
    barber_id: Id | None = None,
) -> FinancialReport:
    """Faturamento, atendimentos concluídos, faltas, totais por barbeiro e por
    forma de pagamento, e a lista dos concluídos do período (até 366 dias).
    Entra o atendimento que **começa** no período, em São Paulo (RN-01, RN-43)."""
    report = service.financial_report(
        session, start=start, end=end, barber_id=barber_id
    )
    return FinancialReport(
        start=start,
        end=end,
        barber_id=barber_id,
        total=report.total,
        completed_count=report.completed_count,
        no_show_count=report.no_show_count,
        by_barber=[
            BarberTotal(
                barber=AgendaBarber(
                    id=row.barber.id, name=row.barber.name, active=row.barber.active
                ),
                total=row.total,
                completed_count=row.completed_count,
                no_show_count=row.no_show_count,
            )
            for row in report.by_barber
        ],
        by_method=[
            MethodTotal(method=row.method, total=row.total, count=row.count)
            for row in report.by_method
        ],
        completed=[
            CompletedAppointment(
                appointment_id=row.appointment.id,
                starts_at=row.appointment.starts_at.astimezone(TIMEZONE),
                customer=ReportCustomer(id=row.customer.id, name=row.customer.name),
                barber=ReportBarber(id=row.barber.id, name=row.barber.name),
                service=AgendaService(id=row.service.id, name=row.service.name),
                amount=row.payment.amount,
                method=row.payment.method,
            )
            for row in report.completed
        ],
    )
