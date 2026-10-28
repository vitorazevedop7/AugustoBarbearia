"""Contrato de erros HTTP da API (ADR 0008)."""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel
from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)


class ErrorResponse(BaseModel):
    code: str
    message: str


class DomainError(Exception):
    """Erro levantado por services, com mensagem pronta para a interface."""

    def __init__(self, *, code: str, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


def register_error_handlers(app: FastAPI) -> None:
    """Centraliza erros de domínio, de entrada e falhas inesperadas."""

    @app.exception_handler(DomainError)
    async def handle_domain_error(_request: Request, exc: DomainError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(code=exc.code, message=exc.message).model_dump(),
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        _request: Request, _exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content=ErrorResponse(
                code="VALIDATION_ERROR",
                message="Confira os dados informados e tente novamente.",
            ).model_dump(),
        )

    @app.exception_handler(HTTPException)
    async def handle_http_error(_request: Request, exc: HTTPException) -> JSONResponse:
        messages = {
            400: "Não foi possível processar a solicitação.",
            401: "Entre na sua conta para continuar.",
            403: "Você não tem permissão para realizar esta ação.",
            404: "O recurso solicitado não foi encontrado.",
            405: "Esta ação não está disponível neste endereço.",
            429: "Muitas solicitações. Aguarde um pouco e tente novamente.",
        }
        return JSONResponse(
            status_code=exc.status_code,
            headers=exc.headers,
            content=ErrorResponse(
                code=f"HTTP_{exc.status_code}",
                message=messages.get(
                    exc.status_code, "Não foi possível atender à solicitação."
                ),
            ).model_dump(),
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(
        _request: Request, exc: Exception
    ) -> JSONResponse:
        logger.error("Erro inesperado ao atender requisição", exc_info=exc)
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                code="INTERNAL_ERROR",
                message="Ocorreu um erro. Tente novamente em instantes.",
            ).model_dump(),
        )
