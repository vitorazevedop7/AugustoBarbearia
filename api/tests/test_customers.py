import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi.testclient import TestClient
from pytest import MonkeyPatch
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.schemas import CurrentUser
from app.modules.customers import service
from app.modules.customers.models import Customer
from app.modules.customers.schemas import normalize_phone
from tests.jwt_tokens import bearer, claims, token


def customer_count(session: Session) -> int:
    return session.scalar(select(func.count()).select_from(Customer)) or 0


def headers_for(private_key: Ed25519PrivateKey, **overrides: object) -> dict[str, str]:
    return bearer(token(private_key, claims(**overrides)))


def test_rn23_primeiro_acesso_cria_cliente_e_o_segundo_nao_duplica(
    auth_client: TestClient, db_session: Session, private_key: Ed25519PrivateKey
) -> None:
    headers = headers_for(private_key, email=" Cliente@Example.com ")
    for _ in range(2):
        response = auth_client.get("/me", headers=headers)
        assert response.status_code == 200
        assert response.json()["has_phone"] is False

    assert customer_count(db_session) == 1
    customer = db_session.scalars(select(Customer)).one()
    assert customer.auth_user_id == "google-user-123"
    assert customer.email == "cliente@example.com"
    assert customer.name == "Cliente Teste"
    assert customer.phone is None


def test_rn23_vincula_cadastro_da_administracao_pelo_email(
    auth_client: TestClient, db_session: Session, private_key: Ed25519PrivateKey
) -> None:
    db_session.add(
        Customer(name="Ana Souza", phone="11987654321", email="ana@example.com")
    )
    db_session.commit()
    headers = headers_for(private_key, sub="google-ana", email=" Ana@Example.COM")

    response = auth_client.get("/me/profile", headers=headers)

    assert response.status_code == 200
    # Os dados que a barbearia cadastrou ficam; o Google não os substitui.
    assert response.json() == {
        "name": "Ana Souza",
        "email": "ana@example.com",
        "phone": "11987654321",
    }
    assert auth_client.get("/me", headers=headers).json()["has_phone"] is True
    assert customer_count(db_session) == 1
    customer = db_session.scalars(select(Customer)).one()
    assert customer.auth_user_id == "google-ana"


def test_rn23_email_vinculado_a_outra_conta_nao_troca_o_vinculo(
    auth_client: TestClient, db_session: Session, private_key: Ed25519PrivateKey
) -> None:
    db_session.add(
        Customer(name="Ana", email="ana@example.com", auth_user_id="google-ana")
    )
    db_session.commit()
    headers = headers_for(private_key, sub="outra-conta", email="ana@example.com")

    for path in ["/me", "/me/profile"]:
        response = auth_client.get(path, headers=headers)
        assert response.status_code == 409
        assert response.json() == {
            "code": "CUSTOMER_EMAIL_LINKED",
            "message": (
                "Este e-mail já está vinculado a outro cadastro. "
                "Fale com a barbearia para resolver."
            ),
        }

    customer = db_session.scalars(select(Customer)).one()
    assert customer.auth_user_id == "google-ana"


def test_rn23_criacao_simultanea_usa_o_cadastro_que_ja_existe(
    auth_client: TestClient,
    db_session: Session,
    private_key: Ed25519PrivateKey,
    monkeypatch: MonkeyPatch,
) -> None:
    # Simula outro pedido da mesma conta criando o cadastro entre a busca e o
    # insert: a primeira busca não acha nada e o insert viola a constraint única.
    db_session.add(
        Customer(
            name="Cliente Teste",
            email="customer@example.com",
            auth_user_id="google-user-123",
        )
    )
    db_session.commit()
    find_or_link = service._find_or_link  # pyright: ignore[reportPrivateUsage]
    calls: list[int] = []

    def first_search_misses(session: Session, user: CurrentUser) -> Customer | None:
        calls.append(1)
        return None if len(calls) == 1 else find_or_link(session, user)

    monkeypatch.setattr(service, "_find_or_link", first_search_misses)

    response = auth_client.get("/me/profile", headers=headers_for(private_key))

    assert response.status_code == 200
    assert len(calls) == 2
    assert customer_count(db_session) == 1


def test_rn71_administracao_nao_vira_cliente(
    auth_client: TestClient, db_session: Session, private_key: Ed25519PrivateKey
) -> None:
    headers = headers_for(private_key, email="admin@example.com")

    response = auth_client.get("/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["role"] == "admin"
    assert response.json()["has_phone"] is False

    for method in ["GET", "PATCH"]:
        response = auth_client.request(
            method, "/me/profile", headers=headers, json={"phone": "11987654321"}
        )
        assert response.status_code == 403
        assert response.json()["code"] == "HTTP_403"
    assert customer_count(db_session) == 0


@pytest.mark.parametrize(
    ("method", "body"), [("GET", None), ("PATCH", {"phone": "11987654321"})]
)
def test_rn16_perfil_exige_login(
    auth_client: TestClient, db_session: Session, method: str, body: object
) -> None:
    response = auth_client.request(method, "/me/profile", json=body)
    assert response.status_code == 401
    assert response.json()["code"] == "HTTP_401"
    assert customer_count(db_session) == 0


def test_rn16_cliente_ve_e_altera_so_o_proprio_perfil(
    auth_client: TestClient, db_session: Session, private_key: Ed25519PrivateKey
) -> None:
    ana = headers_for(
        private_key, sub="google-ana", email="ana@example.com", name="Ana"
    )
    bruno = headers_for(
        private_key, sub="google-bruno", email="bruno@example.com", name="Bruno"
    )
    auth_client.get("/me/profile", headers=bruno)

    response = auth_client.patch(
        "/me/profile", headers=ana, json={"phone": "(11) 98765-4321"}
    )

    assert response.json()["name"] == "Ana"
    assert auth_client.get("/me/profile", headers=bruno).json() == {
        "name": "Bruno",
        "email": "bruno@example.com",
        "phone": None,
    }


def test_rn62_salva_nome_e_telefone(
    auth_client: TestClient, db_session: Session, private_key: Ed25519PrivateKey
) -> None:
    headers = headers_for(private_key)

    response = auth_client.patch(
        "/me/profile",
        headers=headers,
        json={"name": "  Cliente Corrigido  ", "phone": "+55 (11) 98765-4321"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "name": "Cliente Corrigido",
        "email": "customer@example.com",
        "phone": "11987654321",
    }
    assert auth_client.get("/me/profile", headers=headers).json() == response.json()
    assert auth_client.get("/me", headers=headers).json()["has_phone"] is True


def test_rn62_campo_ausente_ou_nulo_nao_apaga_o_telefone(
    auth_client: TestClient, private_key: Ed25519PrivateKey
) -> None:
    headers = headers_for(private_key)
    auth_client.patch("/me/profile", headers=headers, json={"phone": "1134567890"})

    for body in [{"name": "Novo Nome"}, {"phone": None}, {}]:
        response = auth_client.patch("/me/profile", headers=headers, json=body)
        assert response.status_code == 200
        assert response.json()["phone"] == "1134567890"
    assert response.json()["name"] == "Novo Nome"


@pytest.mark.parametrize(
    "body",
    [
        {"phone": "98765-4321"},
        {"phone": "(10) 98765-4321"},
        {"phone": "(11) 88765-4321"},
        {"phone": "(11) 1234-5678"},
        {"phone": "(11) 98765-43210"},
        {"phone": "11 9876a-4321"},
        {"phone": "١١٩٨٧٦٥٤٣٢١"},
        {"phone": ""},
        {"phone": 11987654321},
        {"phone": "1" * 31},
        {"name": "   "},
        {"name": "A" * 121},
        {"email": "outro@example.com"},
    ],
)
def test_rn62_dados_invalidos_nao_alteram_o_perfil(
    auth_client: TestClient,
    db_session: Session,
    private_key: Ed25519PrivateKey,
    body: dict[str, object],
) -> None:
    headers = headers_for(private_key)

    response = auth_client.patch("/me/profile", headers=headers, json=body)

    assert response.status_code == 422
    assert response.json() == {
        "code": "VALIDATION_ERROR",
        "message": "Confira os dados informados e tente novamente.",
    }
    assert auth_client.get("/me/profile", headers=headers).json() == {
        "name": "Cliente Teste",
        "email": "customer@example.com",
        "phone": None,
    }


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("(11) 98765-4321", "11987654321"),
        ("+55 21 3456-7890", "2134567890"),
        ("11987654321", "11987654321"),
        ("(99) 9.8765.4321", "99987654321"),
        (" 55 5432-1098 ", "5554321098"),
    ],
)
def test_rn62_formato_do_telefone(value: str, expected: str) -> None:
    assert normalize_phone(value) == expected


def test_rn62_banco_exige_email_do_google_e_telefone_sem_conta(
    db_session: Session,
) -> None:
    for invalid in [
        Customer(name="Sem conta e sem telefone", email="a@example.com"),
        Customer(name="Google sem e-mail", auth_user_id="google-x"),
    ]:
        with pytest.raises(IntegrityError), db_session.begin_nested():
            db_session.add(invalid)
            db_session.flush()


def test_rn10_openapi_documenta_perfil_e_has_phone(auth_client: TestClient) -> None:
    spec = auth_client.get("/openapi.json").json()
    for method in ["get", "patch"]:
        operation = spec["paths"]["/me/profile"][method]
        assert operation["security"] == [{"HTTPBearer": []}]
        assert {"401", "403", "409"} <= set(operation["responses"])
    assert "has_phone" in spec["components"]["schemas"]["Me"]["required"]
