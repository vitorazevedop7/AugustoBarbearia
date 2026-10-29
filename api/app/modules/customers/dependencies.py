"""Cliente da conta autenticada, para as rotas `/me` (RN-16)."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import require_customer
from app.auth.schemas import CurrentUser
from app.db import get_session
from app.modules.customers.models import Customer
from app.modules.customers.service import resolve_customer


def current_customer(
    user: Annotated[CurrentUser, Depends(require_customer)],
    session: Annotated[Session, Depends(get_session)],
) -> Customer:
    """O cliente vem sempre do token, nunca de um id na requisição (RN-16)."""
    return resolve_customer(session, user)
