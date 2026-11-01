"""Rotas `/admin/time-blocks`: bloqueios e folgas (RN-03, RN-70)."""

import datetime as dt
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_admin
from app.clock import TIMEZONE
from app.db import get_session
from app.errors import ErrorResponse
from app.modules.agenda.schemas import AgendaBarber
from app.modules.time_blocks import service
from app.modules.time_blocks.schemas import TimeBlockCreate, TimeBlockResponse

router = APIRouter(
    prefix="/admin/time-blocks",
    tags=["Bloqueios"],
    dependencies=[Depends(require_admin)],
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
    },
)

SessionDep = Annotated[Session, Depends(get_session)]


def to_response(entry: service.TimeBlockEntry) -> TimeBlockResponse:
    block = entry.block
    return TimeBlockResponse(
        id=block.id,
        barber=AgendaBarber(
            id=entry.barber.id, name=entry.barber.name, active=entry.barber.active
        ),
        # RN-01: o banco devolve UTC; a resposta sai no fuso de São Paulo.
        starts_at=block.starts_at.astimezone(TIMEZONE),
        ends_at=block.ends_at.astimezone(TIMEZONE),
        all_day=service.is_all_day(block),
        reason=block.reason,
    )


@router.get("", response_model=list[TimeBlockResponse])
def list_time_blocks(
    start: Annotated[dt.date, Query(description="Data local de São Paulo.")],
    end: Annotated[dt.date, Query(description="Data local de São Paulo, inclusiva.")],
    session: SessionDep,
    barber_id: int | None = None,
) -> list[TimeBlockResponse]:
    """Os bloqueios que cruzam o período (até 7 dias), por início (RN-03)."""
    entries = service.list_time_blocks(
        session, start=start, end=end, barber_id=barber_id
    )
    return [to_response(entry) for entry in entries]


@router.post(
    "",
    response_model=TimeBlockResponse,
    status_code=status.HTTP_201_CREATED,
    responses={409: {"model": ErrorResponse}},
)
def create_time_block(data: TimeBlockCreate, session: SessionDep) -> TimeBlockResponse:
    """Bloqueia um intervalo, ou o dia inteiro, sem agendamentos ativos (RN-03)."""
    return to_response(service.create_time_block(session, data))


@router.get("/{block_id}", response_model=TimeBlockResponse)
def get_time_block(block_id: int, session: SessionDep) -> TimeBlockResponse:
    return to_response(service.get_time_block(session, block_id))


@router.delete("/{block_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_time_block(block_id: int, session: SessionDep) -> Response:
    """Remove o bloqueio; os horários voltam na hora (RN-05)."""
    service.delete_time_block(session, block_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
