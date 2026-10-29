from fastapi.testclient import TestClient


def test_health_returns_ok_with_postgres(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_response_is_documented_in_openapi(client: TestClient) -> None:
    schema = client.get("/openapi.json").json()

    response_schema = schema["paths"]["/health"]["get"]["responses"]["200"]["content"][
        "application/json"
    ]["schema"]
    assert response_schema == {"$ref": "#/components/schemas/HealthResponse"}
    assert (
        schema["components"]["schemas"]["HealthResponse"]["properties"]["status"][
            "const"
        ]
        == "ok"
    )


def test_health_returns_503_when_postgres_is_unavailable() -> None:
    from collections.abc import Iterator

    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    from app.db import get_session
    from app.main import create_app

    # Porta local sem servidor: exercita a falha real do driver, sem parar o db.
    engine = create_engine(
        "postgresql+psycopg://invalid:private-password@127.0.0.1:1/unavailable",
        connect_args={"connect_timeout": 1},
    )

    def unavailable_session() -> Iterator[Session]:
        with Session(engine) as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_session] = unavailable_session
    try:
        with TestClient(app) as client:
            response = client.get("/health")
        assert response.status_code == 503
        assert response.json() == {
            "code": "DATABASE_UNAVAILABLE",
            "message": (
                "O banco de dados está indisponível. Tente novamente em instantes."
            ),
        }
    finally:
        engine.dispose()
