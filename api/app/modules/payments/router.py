"""Rotas `/admin/appointments/{id}/...`: concluir, marcar falta e corrigir o
pagamento (RN-31, RN-33, RN-40, RN-41, RN-70)."""

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import require_admin
from app.auth.schemas import CurrentUser
from app.clock import utc_now
from app.db import get_session
from app.errors import ErrorResponse
from app.ids import Id
from app.modules.agenda.router import to_response
from app.modules.agenda.schemas import AdminAppointmentResponse
from app.modules.agenda.service import get_admin_appointment
from app.modules.payments import service
from app.modules.payments.schemas import CompleteAppointment, PaymentUpdate

router = APIRouter(
    prefix="/admin/appointments",
    tags=["Pagamentos"],
    dependencies=[Depends(require_admin)],
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        409: {"model": ErrorResponse},
    },
)

SessionDep = Annotated[Session, Depends(get_session)]
AdminDep = Annotated[CurrentUser, Depends(require_admin)]
NowDep = Annotated[datetime, Depends(utc_now)]


@router.post("/{appointment_id}/complete", response_model=AdminAppointmentResponse)
def complete_appointment(
    appointment_id: Id,
    body: CompleteAppointment,
    session: SessionDep,
    admin: AdminDep,
    now: NowDep,
) -> AdminAppointmentResponse:
    """Conclui o atendimento com o pagamento (RN-31, RN-40). Sem `amount`, vale
    o preço congelado do agendamento (RN-13)."""
    service.complete_appointment(
        session,
        appointment_id,
        method=body.method,
        amount=body.amount,
        admin_email=admin.email,
        now=now,
    )
    return to_response(get_admin_appointment(session, appointment_id))


@router.post("/{appointment_id}/no-show", response_model=AdminAppointmentResponse)
def mark_no_show(
    appointment_id: Id, session: SessionDep, admin: AdminDep, now: NowDep
) -> AdminAppointmentResponse:
    """Marca que o cliente faltou (RN-31)."""
    service.mark_no_show(session, appointment_id, admin_email=admin.email, now=now)
    return to_response(get_admin_appointment(session, appointment_id))


@router.patch("/{appointment_id}/payment", response_model=AdminAppointmentResponse)
def correct_payment(
    appointment_id: Id, body: PaymentUpdate, session: SessionDep
) -> AdminAppointmentResponse:
    """Corrige o valor e/ou a forma de pagamento de um atendimento concluído,
    sem mudar o status (RN-41). Só os campos enviados mudam."""
    service.correct_payment(
        session, appointment_id, method=body.method, amount=body.amount
    )
    return to_response(get_admin_appointment(session, appointment_id))
