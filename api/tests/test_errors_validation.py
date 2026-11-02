"""Mensagem do `422 VALIDATION_ERROR` (ADR 0008, RN-62): o que corrigir."""

from typing import Any

import pytest

from app.errors import VALIDATION_MESSAGE, InvalidInput, validation_message


@pytest.mark.parametrize(
    ("error", "message"),
    [
        (
            {
                "type": "value_error",
                "loc": ("body", "phone"),
                "ctx": {"error": InvalidInput("Informe o telefone com DDD.")},
            },
            "Informe o telefone com DDD.",
        ),
        (
            {"type": "missing", "loc": ("body", "customer", "phone")},
            "Informe o telefone.",
        ),
        ({"type": "string_too_short", "loc": ("body", "name")}, "Informe o nome."),
        (
            {
                "type": "string_too_long",
                "loc": ("body", "reason"),
                "ctx": {"max_length": 200},
            },
            "O motivo pode ter no máximo 200 caracteres.",
        ),
        (
            {"type": "time_parsing", "loc": ("body", "business_hours", 0, "opens_at")},
            "Confira a abertura.",
        ),
        # `ValueError` comum: a mensagem é de quem programa, não vai para a tela.
        (
            {
                "type": "value_error",
                "loc": ("body", "price"),
                "ctx": {"error": ValueError("Envie o valor como texto decimal.")},
            },
            "Confira o preço.",
        ),
        ({"type": "int_parsing", "loc": ("query", "barber_id")}, VALIDATION_MESSAGE),
        ({"type": "extra_forbidden", "loc": ("body", "email")}, VALIDATION_MESSAGE),
    ],
)
def test_rn62_mensagem_diz_o_campo_a_corrigir(
    error: dict[str, Any], message: str
) -> None:
    assert validation_message([error]) == message


def test_sem_erros_a_mensagem_e_a_generica() -> None:
    assert validation_message([]) == VALIDATION_MESSAGE
