"""Rota de prova da administração; `/me` fica em `modules/customers`."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.auth.dependencies import require_admin
from app.auth.schemas import AdminPingResponse, CurrentUser
from app.errors import ErrorResponse

router = APIRouter(tags=["auth"], responses={401: {"model": ErrorResponse}})


@router.get(
    "/admin/ping",
    response_model=AdminPingResponse,
    responses={403: {"model": ErrorResponse}},
)
def admin_ping(
    _user: Annotated[CurrentUser, Depends(require_admin)],
) -> AdminPingResponse:
    return AdminPingResponse()
