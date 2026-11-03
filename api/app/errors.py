"""Contrato de erros HTTP da API (ADR 0008)."""

import logging
from collections.abc import Mapping, Sequence
from typing import Any

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
    """Erro levantado por services, com mensagem pronta para a interface.

    `extra` acrescenta campos ao corpo, além de `code` e `message` (por exemplo,
    os agendamentos que impedem a mudança do expediente, RN-02). Os valores já
    vêm prontos para JSON.
    """

    def __init__(
        self,
        *,
        code: str,
        message: str,
        status_code: int = 400,
        extra: Mapping[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.extra = extra or {}


class InvalidInput(ValueError):
    """Valor recusado por um validador dos schemas, com a mensagem pronta para
    a pessoa. O `422` usa o texto dela (RN-62); um `ValueError` comum fica com
    a mensagem montada pelo nome do campo."""


VALIDATION_MESSAGE = "Confira os dados informados e tente novamente."

# Como cada campo dos formulários aparece na mensagem do `422`, com o artigo.
FIELD_LABELS = {
    "name": "o nome",
    "phone": "o telefone",
    "email": "o e-mail",
    "whatsapp": "o WhatsApp",
    "instagram": "o Instagram",
    "address": "o endereço",
    "tagline": "a frase de destaque",
    "about": "o texto sobre a barbearia",
    "description": "a descrição",
    "price": "o preço",
    "amount": "o valor",
    "duration_minutes": "a duração",
    "barber_ids": "os barbeiros",
    "photo_path": "a foto",
    "bio": "a apresentação",
    "opens_at": "a abertura",
    "closes_at": "o fechamento",
    "date": "a data",
    "start_time": "o início",
    "end_time": "o fim",
    "reason": "o motivo",
    "starts_at": "o horário",
    "method": "a forma de pagamento",
}


def validation_message(errors: Sequence[Any]) -> str:
    """O `message` do `422`: diz o que corrigir no primeiro campo inválido.

    A mensagem de um `InvalidInput` vai como está. Nos outros erros, o campo
    vem do fim do `loc` (`("body", "customer", "phone")` é o telefone); se ele
    não é um campo de formulário, a mensagem é a genérica.
    """
    if not errors:
        return VALIDATION_MESSAGE
    error = errors[0]
    cause = error.get("ctx", {}).get("error")
    if isinstance(cause, InvalidInput):
        return str(cause)
    field = next(
        (
            part
            for part in reversed(error.get("loc", ()))
            if isinstance(part, str) and part in FIELD_LABELS
        ),
        None,
    )
    if field is None:
        return VALIDATION_MESSAGE
    label = FIELD_LABELS[field]
    match error.get("type"):
        case "extra_forbidden":
            # Campo que o formulário não envia: erro de quem chamou a API.
            return VALIDATION_MESSAGE
        case "missing" | "string_too_short" | "too_short":
            return f"Informe {label}."
        case "string_too_long":
            limit = error.get("ctx", {}).get("max_length")
            return (
                f"{label[0].upper()}{label[1:]} pode ter no máximo {limit} caracteres."
            )
        case _:
            return f"Confira {label}."


def register_error_handlers(app: FastAPI) -> None:
    """Centraliza erros de domínio, de entrada e falhas inesperadas."""

    @app.exception_handler(DomainError)
    async def handle_domain_error(_request: Request, exc: DomainError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                **exc.extra,
                **ErrorResponse(code=exc.code, message=exc.message).model_dump(),
            },
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content=ErrorResponse(
                code="VALIDATION_ERROR", message=validation_message(exc.errors())
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
