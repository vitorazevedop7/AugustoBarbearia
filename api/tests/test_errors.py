import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.errors import DomainError
from app.main import create_app


def test_domain_error_preserves_status_code_and_message() -> None:
    app = create_app()

    @app.get("/domain-error")
    async def domain_error() -> None:
        raise DomainError(
            code="EXAMPLE_CONFLICT",
            message="Esse horário acabou de ser reservado. Escolha outro.",
            status_code=409,
        )

    with TestClient(app) as client:
        response = client.get("/domain-error")

    assert response.status_code == 409
    assert response.json() == {
        "code": "EXAMPLE_CONFLICT",
        "message": "Esse horário acabou de ser reservado. Escolha outro.",
    }


@pytest.mark.parametrize(
    ("method", "path", "status", "message"),
    [
        ("GET", "/missing", 404, "O recurso solicitado não foi encontrado."),
        ("POST", "/health", 405, "Esta ação não está disponível neste endereço."),
    ],
)
def test_http_errors_follow_contract(
    client: TestClient, method: str, path: str, status: int, message: str
) -> None:
    response = client.request(method, path)

    assert response.status_code == status
    assert response.json() == {"code": f"HTTP_{status}", "message": message}
    if status == 405:
        assert response.headers["allow"] == "GET"


def test_http_error_preserves_authentication_header() -> None:
    app = create_app()

    @app.get("/unauthorized")
    async def unauthorized() -> None:
        raise HTTPException(status_code=401, headers={"WWW-Authenticate": "Bearer"})

    with TestClient(app) as client:
        response = client.get("/unauthorized")

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
    assert response.json() == {
        "code": "HTTP_401",
        "message": "Entre na sua conta para continuar.",
    }


def test_validation_error_uses_public_contract() -> None:
    app = create_app()

    @app.get("/items/{item_id}")
    async def get_item(item_id: int) -> dict[str, int]:
        return {"id": item_id}

    with TestClient(app) as client:
        response = client.get("/items/invalid")
        schema = client.get("/openapi.json").json()

    assert response.status_code == 422
    assert response.json() == {
        "code": "VALIDATION_ERROR",
        "message": "Confira os dados informados e tente novamente.",
    }
    assert schema["paths"]["/items/{item_id}"]["get"]["responses"]["422"]["content"][
        "application/json"
    ]["schema"] == {"$ref": "#/components/schemas/ErrorResponse"}


def test_unexpected_error_does_not_expose_internal_details() -> None:
    app = create_app()

    @app.get("/unexpected-error")
    async def unexpected_error() -> None:
        raise RuntimeError("internal connection details")

    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.get("/unexpected-error")

    assert response.status_code == 500
    assert response.json() == {
        "code": "INTERNAL_ERROR",
        "message": "Ocorreu um erro. Tente novamente em instantes.",
    }
