import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.customers.models import Customer
from tests.jwt_tokens import bearer, claims, token

NEW_CUSTOMER = {"name": "  Ana Souza  ", "phone": "(75) 99999-0000"}


def create(admin: TestClient, **changes: object) -> dict[str, object]:
    response = admin.post("/admin/customers", json={**NEW_CUSTOMER, **changes})
    assert response.status_code == 201, response.text
    return response.json()


def customer_count(session: Session) -> int:
    return session.scalar(select(func.count()).select_from(Customer)) or 0


def search(admin: TestClient, **params: object) -> dict[str, object]:
    response = admin.get("/admin/customers", params=params)
    assert response.status_code == 200, response.text
    return response.json()


def names(admin: TestClient, **params: object) -> list[str]:
    return [item["name"] for item in search(admin, **params)["items"]]  # type: ignore[index]


def test_rn20_cadastra_cliente_so_com_nome_e_telefone(
    admin: TestClient, db_session: Session
) -> None:
    response = admin.post("/admin/customers", json=NEW_CUSTOMER)

    assert response.status_code == 201
    created = response.json()
    assert created == {
        "id": created["id"],
        "name": "Ana Souza",
        "phone": "75999990000",
        "email": None,
        "has_account": False,
    }
    customer = db_session.get(Customer, created["id"])
    assert customer is not None
    assert customer.auth_user_id is None


@pytest.mark.parametrize("email", [None, "", "   "])
def test_rn20_email_vazio_vira_ausencia_de_email(
    admin: TestClient, email: str | None
) -> None:
    assert create(admin, email=email)["email"] is None


def test_rn23_email_do_cadastro_e_normalizado(admin: TestClient) -> None:
    assert create(admin, email=" Ana@Example.COM ")["email"] == "ana@example.com"


@pytest.mark.parametrize(
    "payload",
    [
        {"phone": "75999990000"},
        {"name": "Ana"},
        {"name": "   ", "phone": "75999990000"},
        {"name": "x" * 121, "phone": "75999990000"},
        {"name": "Ana", "phone": "99990000"},
        {"name": "Ana", "phone": "(10) 98765-4321"},
        {"name": "Ana", "phone": None},
        {"name": "Ana", "phone": "75999990000", "email": "sem-arroba"},
        {"name": "Ana", "phone": "75999990000", "email": "a@b"},
        {"name": "Ana", "phone": "75999990000", "email": "a b@c.com"},
        {"name": "Ana", "phone": "75999990000", "email": f"{'a' * 320}@c.com"},
        {"name": "Ana", "phone": "75999990000", "auth_user_id": "google-1"},
    ],
)
def test_rn62_dados_invalidos_nao_cadastram(
    admin: TestClient, db_session: Session, payload: dict[str, object]
) -> None:
    response = admin.post("/admin/customers", json=payload)

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"
    assert customer_count(db_session) == 0


def test_rn62_telefone_pode_repetir_entre_clientes(admin: TestClient) -> None:
    first = create(admin, name="Pai")
    second = create(admin, name="Filho")

    assert first["id"] != second["id"]
    assert first["phone"] == second["phone"]


def test_rn23_email_repetido_no_cadastro_responde_409(
    admin: TestClient, db_session: Session
) -> None:
    create(admin, email="ana@example.com")

    response = admin.post(
        "/admin/customers",
        json={"name": "Outra", "phone": "75988880000", "email": "ANA@example.com"},
    )

    assert response.status_code == 409
    assert response.json() == {
        "code": "CUSTOMER_EMAIL_TAKEN",
        "message": "Já existe um cliente cadastrado com este e-mail.",
    }
    assert customer_count(db_session) == 1
    # A sessão segue utilizável depois do conflito.
    assert create(admin, name="Sem e-mail")["email"] is None


def test_rn20_busca_por_parte_do_nome_sem_diferenciar_caixa(
    admin: TestClient,
) -> None:
    for name in ["Maria Souza", "João Pereira", "Ana Sousa", "Carlos"]:
        create(admin, name=name)

    assert names(admin, q="sou") == ["Ana Sousa", "Maria Souza"]
    assert names(admin, q="SOUZA") == ["Maria Souza"]
    assert names(admin, q=" so ") == ["Ana Sousa", "Maria Souza"]
    assert names(admin, q="inexistente") == []


def test_rn20_busca_por_telefone_com_ou_sem_formatacao(admin: TestClient) -> None:
    create(admin, name="Ana", phone="75999990000")
    create(admin, name="Beto", phone="1198765-4321")
    create(admin, name="Caio", phone="75988881111")

    assert names(admin, q="99999") == ["Ana"]
    assert names(admin, q="(75) 9999") == ["Ana"]
    assert names(admin, q="+55 75 9888") == ["Caio"]
    assert names(admin, q="4321") == ["Beto"]
    assert names(admin, q="75") == ["Ana", "Caio"]


def test_rn20_busca_por_email(admin: TestClient) -> None:
    create(admin, name="Ana", email="ana.souza@example.com")
    create(admin, name="Beto", email=None)

    assert names(admin, q="souza@exa") == ["Ana"]
    # Dígitos num e-mail não viram busca por telefone.
    assert names(admin, q="ana2@") == []


def test_busca_trata_curingas_do_like_como_texto(admin: TestClient) -> None:
    create(admin, name="Ana")
    create(admin, name="Beto 100%", phone="75988881111")

    assert names(admin, q="%") == ["Beto 100%"]
    assert names(admin, q="_") == []
    assert names(admin, q="100%") == ["Beto 100%"]


def test_busca_vazia_devolve_todos_por_nome(admin: TestClient) -> None:
    for name in ["carlos", "Ana", "Beto"]:
        create(admin, name=name)

    assert names(admin) == ["Ana", "Beto", "carlos"]
    assert names(admin, q="  ") == ["Ana", "Beto", "carlos"]


def test_busca_e_paginada_e_informa_o_total(admin: TestClient) -> None:
    for number in range(1, 6):
        create(admin, name=f"Cliente {number}")

    first = search(admin, page=1, page_size=2)
    last = search(admin, page=3, page_size=2)
    beyond = search(admin, page=4, page_size=2)

    assert [item["name"] for item in first["items"]] == ["Cliente 1", "Cliente 2"]  # type: ignore[index]
    assert first["total"] == 5
    assert (first["page"], first["page_size"]) == (1, 2)
    assert [item["name"] for item in last["items"]] == ["Cliente 5"]  # type: ignore[index]
    assert beyond["items"] == []
    assert beyond["total"] == 5
    assert search(admin, q="Cliente 3", page_size=2)["total"] == 1


@pytest.mark.parametrize(
    "params",
    [
        {"page": 0},
        {"page": -1},
        {"page": 100_001},
        {"page_size": 0},
        {"page_size": 51},
        {"q": "x" * 101},
    ],
)
def test_busca_fora_dos_limites_responde_422(
    admin: TestClient, params: dict[str, object]
) -> None:
    response = admin.get("/admin/customers", params=params)

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"


def test_le_um_cliente_e_informa_se_tem_conta(
    admin: TestClient, db_session: Session
) -> None:
    created = create(admin, email="ana@example.com")
    google = Customer(name="Beto", email="beto@example.com", auth_user_id="google-b")
    db_session.add(google)
    db_session.commit()

    response = admin.get(f"/admin/customers/{created['id']}")
    assert response.status_code == 200
    assert response.json() == created

    response = admin.get(f"/admin/customers/{google.id}")
    assert response.json() == {
        "id": google.id,
        "name": "Beto",
        "phone": None,
        "email": "beto@example.com",
        "has_account": True,
    }
    # O vínculo em si (o `sub`) não sai da API.
    assert "auth_user_id" not in response.json()


def test_cliente_inexistente_responde_404(admin: TestClient) -> None:
    for method in ["GET", "PATCH"]:
        response = admin.request(method, "/admin/customers/999999", json={})

        assert response.status_code == 404
        assert response.json() == {
            "code": "CUSTOMER_NOT_FOUND",
            "message": "Cliente não encontrado.",
        }


@pytest.mark.parametrize("customer_id", ["0", "-1", "2147483648", "abc"])
def test_id_fora_do_limite_do_banco_responde_422(
    admin: TestClient, customer_id: str
) -> None:
    response = admin.get(f"/admin/customers/{customer_id}")

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"


def test_rn62_edita_so_os_campos_enviados(admin: TestClient) -> None:
    created = create(admin, email="ana@example.com")

    response = admin.patch(
        f"/admin/customers/{created['id']}", json={"name": " Ana Maria "}
    )

    assert response.status_code == 200
    assert response.json() == {**created, "name": "Ana Maria"}

    response = admin.patch(
        f"/admin/customers/{created['id']}",
        json={"phone": "11 98765-4321", "name": None},
    )
    assert response.json() == {
        **created,
        "name": "Ana Maria",
        "phone": "11987654321",
    }


@pytest.mark.parametrize("empty", [None, "", "  "])
def test_cliente_sem_conta_pode_ficar_sem_email(
    admin: TestClient, empty: str | None
) -> None:
    created = create(admin, email="ana@example.com")

    response = admin.patch(f"/admin/customers/{created['id']}", json={"email": empty})

    assert response.status_code == 200
    assert response.json()["email"] is None


def test_cliente_sem_conta_troca_o_email(admin: TestClient) -> None:
    created = create(admin)

    response = admin.patch(
        f"/admin/customers/{created['id']}", json={"email": "Novo@Example.com"}
    )

    assert response.json()["email"] == "novo@example.com"


@pytest.mark.parametrize(
    "payload",
    [
        {"name": ""},
        {"phone": "123"},
        {"email": "invalido"},
        {"auth_user_id": "google-1"},
    ],
)
def test_rn62_edicao_invalida_nao_grava(
    admin: TestClient, db_session: Session, payload: dict[str, object]
) -> None:
    created = create(admin)

    response = admin.patch(f"/admin/customers/{created['id']}", json=payload)

    assert response.status_code == 422
    assert admin.get(f"/admin/customers/{created['id']}").json() == created


def test_rn23_email_repetido_na_edicao_responde_409(admin: TestClient) -> None:
    create(admin, name="Ana", email="ana@example.com")
    other = create(admin, name="Beto", email="beto@example.com")

    response = admin.patch(
        f"/admin/customers/{other['id']}", json={"email": "ANA@example.com"}
    )

    assert response.status_code == 409
    assert response.json()["code"] == "CUSTOMER_EMAIL_TAKEN"
    assert admin.get(f"/admin/customers/{other['id']}").json() == other


def test_rn23_email_de_quem_tem_conta_google_fica_travado(
    admin: TestClient, db_session: Session
) -> None:
    google = Customer(
        name="Ana", phone="75999990000", email="ana@example.com", auth_user_id="g-1"
    )
    db_session.add(google)
    db_session.commit()
    url = f"/admin/customers/{google.id}"

    for email in ["outro@example.com", None, ""]:
        response = admin.patch(url, json={"email": email})
        assert response.status_code == 409
        assert response.json() == {
            "code": "CUSTOMER_EMAIL_LOCKED",
            "message": (
                "O e-mail deste cliente vem da conta Google e não pode ser alterado."
            ),
        }
    assert admin.get(url).json()["email"] == "ana@example.com"

    # Reenviar o mesmo e-mail (em outra caixa) não é mudança.
    response = admin.patch(url, json={"email": "ANA@example.com", "name": "Ana M."})
    assert response.status_code == 200
    assert response.json()["name"] == "Ana M."
    assert response.json()["email"] == "ana@example.com"


def test_rn10_administracao_informa_o_telefone_de_quem_veio_do_google(
    admin: TestClient, db_session: Session
) -> None:
    google = Customer(name="Ana", email="ana@example.com", auth_user_id="g-1")
    db_session.add(google)
    db_session.commit()

    response = admin.patch(
        f"/admin/customers/{google.id}", json={"phone": "75999990000"}
    )

    assert response.status_code == 200
    assert response.json()["phone"] == "75999990000"


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("GET", "/admin/customers"),
        ("POST", "/admin/customers"),
        ("GET", "/admin/customers/1"),
        ("PATCH", "/admin/customers/1"),
    ],
)
def test_rn70_cliente_nao_acessa_o_cadastro_da_administracao(
    customer: TestClient, method: str, path: str
) -> None:
    response = customer.request(method, path, json=NEW_CUSTOMER)

    assert response.status_code == 403
    assert response.json()["code"] == "HTTP_403"


def test_rn70_visitante_sem_token_recebe_401(client: TestClient) -> None:
    response = client.get("/admin/customers")

    assert response.status_code == 401


def test_rn23_cadastro_da_administracao_e_vinculado_no_login_google(
    auth_client: TestClient, db_session: Session, private_key: Ed25519PrivateKey
) -> None:
    """De ponta a ponta, só com JWT: cadastro pela administração, login Google
    com o mesmo e-mail e a administração vendo o vínculo."""
    admin_headers = bearer(
        token(private_key, claims(sub="admin-1", email="admin@example.com"))
    )
    created = auth_client.post(
        "/admin/customers",
        headers=admin_headers,
        json={"name": "Ana Souza", "phone": "75999990000", "email": "Ana@Example.com"},
    ).json()
    url = f"/admin/customers/{created['id']}"
    assert auth_client.get(url, headers=admin_headers).json()["has_account"] is False
    customer_headers = bearer(
        token(
            private_key,
            claims(sub="google-ana", email=" ANA@example.com ", name="Ana do Google"),
        )
    )

    profile = auth_client.get("/me/profile", headers=customer_headers)

    assert profile.status_code == 200
    # O cadastro da barbearia vale; o Google não troca o nome nem o telefone.
    assert profile.json() == {
        "name": "Ana Souza",
        "email": "ana@example.com",
        "phone": "75999990000",
    }
    assert customer_count(db_session) == 1
    linked = auth_client.get(url, headers=admin_headers).json()
    assert linked["has_account"] is True
    assert linked["name"] == "Ana Souza"
    # Depois do vínculo, o e-mail é o da conta Google.
    locked = auth_client.patch(url, headers=admin_headers, json={"email": "x@y.com"})
    assert locked.status_code == 409
    assert locked.json()["code"] == "CUSTOMER_EMAIL_LOCKED"
    # O cliente não consegue usar as rotas da administração.
    assert (
        auth_client.get("/admin/customers", headers=customer_headers).status_code == 403
    )
