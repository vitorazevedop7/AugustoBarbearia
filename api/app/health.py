"""Healthcheck da API e da conexão com PostgreSQL."""

from typing import Annotated, Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db import get_session
from app.errors import DomainError, ErrorResponse

router = APIRouter(tags=["Saúde"])


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"


@router.get(
    "/health",
    response_model=HealthResponse,
    responses={503: {"model": ErrorResponse}},
)
def health(session: Annotated[Session, Depends(get_session)]) -> HealthResponse:
    try:
        session.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        raise DomainError(
            code="DATABASE_UNAVAILABLE",
            message="O banco de dados está indisponível. Tente novamente em instantes.",
            status_code=503,
        ) from exc
    return HealthResponse()
