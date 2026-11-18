"""Rota `/admin/dashboard`: o painel de indicadores (RN-45, RN-70)."""

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import require_admin
from app.clock import utc_now
from app.db import get_session
from app.errors import ErrorResponse
from app.modules.dashboard import service
from app.modules.dashboard.schemas import Dashboard

router = APIRouter(
    prefix="/admin/dashboard",
    tags=["Painel"],
    dependencies=[Depends(require_admin)],
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
    },
)

SessionDep = Annotated[Session, Depends(get_session)]
NowDep = Annotated[datetime, Depends(utc_now)]


@router.get("", response_model=Dashboard)
def dashboard(session: SessionDep, now: NowDep) -> Dashboard:
    """Os indicadores do negócio no momento da chamada, em São Paulo (RN-01):
    o mês até hoje comparado ao mesmo trecho do mês anterior, o faturamento dos
    últimos 30 dias, a ocupação de cada barbeiro, os horários de pico dos
    últimos 90 dias e os atendimentos de hoje (RN-45)."""
    return Dashboard.model_validate(
        service.dashboard(session, now), from_attributes=True
    )
