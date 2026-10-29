import pytest
from fastapi.testclient import TestClient

NEW_BARBER = {
    "name": "  Carlos  ",
    "photo_path": "/images/barbeiros/carlos-silva.webp",
    "bio": "Especialista em degradê.",
}


def create(admin: TestClient, **changes: object) -> dict[str, object]:
    response = admin.post("/admin/barbers", json={**NEW_BARBER, **changes})
    assert response.status_code == 201
    return response.json()


def test_rn63_proprietarios_ja_cadastrados(
    admin: TestClient,
) -> None:
    response = admin.get("/admin/barbers")

    assert response.status_code == 200
    assert [
        {key: barber[key] for key in ("name", "photo_path", "bio", "active")}
        for barber in response.json()
    ] == [
        {
            "name": name,
            "photo_path": None,
            "bio": None,
            "active": True,
        }
        for name in ("Edvaldo", "Lauro", "Manoel")
    ]


def test_rn60_cria_barbeiro_ativo(admin: TestClient) -> None:
    created = create(admin)

    assert created == {
        "id": created["id"],
        "name": "Carlos",
        "photo_path": "/images/barbeiros/carlos-silva.webp",
        "bio": "Especialista em degradê.",
        "active": True,
    }
    assert admin.get(f"/admin/barbers/{created['id']}").json() == created
    assert created in admin.get("/admin/barbers").json()


def test_rn60_foto_e_apresentacao_sao_opcionais(admin: TestClient) -> None:
    created = create(admin, photo_path="", bio="   ")

    assert created["photo_path"] is None
    assert created["bio"] is None


def test_rn60_apresentacao_aceita_ate_400_caracteres(admin: TestClient) -> None:
    assert create(admin, bio="a" * 400)["bio"] == "a" * 400


@pytest.mark.parametrize(
    "change",
    [
        {"name": "   "},
        {"name": "a" * 81},
        {"bio": "a" * 401},
        {"photo_path": "https://example.com/foto.jpg"},
        {"photo_path": "/images/barbeiros/../segredo.jpg"},
        {"photo_path": "/images/barbeiros/Carlos.jpg"},
        {"photo_path": "/images/barbeiros/carlos.gif"},
        {"photo_path": "/images/servicos/corte.jpg"},
    ],
)
def test_rn60_validacoes_de_cadastro(admin: TestClient, change: dict[str, str]) -> None:
    before = admin.get("/admin/barbers").json()

    response = admin.post("/admin/barbers", json={**NEW_BARBER, **change})

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"
    assert admin.get("/admin/barbers").json() == before


def test_rn60_cadastro_exige_nome(admin: TestClient) -> None:
    response = admin.post("/admin/barbers", json={"bio": "Sem nome."})

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"


def test_rn60_edicao_altera_so_os_campos_enviados(admin: TestClient) -> None:
    created = create(admin)

    response = admin.patch(
        f"/admin/barbers/{created['id']}", json={"bio": "Nova apresentação."}
    )

    assert response.status_code == 200
    assert response.json() == {**created, "bio": "Nova apresentação."}


def test_rn60_edicao_remove_foto_e_apresentacao(admin: TestClient) -> None:
    created = create(admin)

    response = admin.patch(
        f"/admin/barbers/{created['id']}", json={"photo_path": "", "bio": None}
    )

    assert response.status_code == 200
    assert response.json() == {**created, "photo_path": None, "bio": None}


@pytest.mark.parametrize(
    "change",
    [{"name": None}, {"name": ""}, {"active": None}, {"bio": "a" * 401}],
)
def test_rn60_edicao_valida_os_campos(
    admin: TestClient, change: dict[str, object]
) -> None:
    created = create(admin)

    response = admin.patch(f"/admin/barbers/{created['id']}", json=change)

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"
    assert admin.get(f"/admin/barbers/{created['id']}").json() == created


def test_rn60_inativa_e_reativa_sem_perder_o_cadastro(admin: TestClient) -> None:
    created = create(admin, name="Zeca")
    path = f"/admin/barbers/{created['id']}"

    inactive = admin.patch(path, json={"active": False})
    listed = admin.get("/admin/barbers").json()

    assert inactive.status_code == 200
    assert inactive.json() == {**created, "active": False}
    # Os inativos continuam na lista, depois dos ativos.
    assert listed[-1] == inactive.json()

    active = admin.patch(path, json={"active": True})

    assert active.status_code == 200
    assert active.json() == created


def test_rn60_lista_ativos_primeiro_e_depois_por_nome(admin: TestClient) -> None:
    edvaldo = admin.get("/admin/barbers").json()[0]
    admin.patch(f"/admin/barbers/{edvaldo['id']}", json={"active": False})
    create(admin, name="Bruno")

    names = [barber["name"] for barber in admin.get("/admin/barbers").json()]

    assert names == ["Bruno", "Lauro", "Manoel", "Edvaldo"]


@pytest.mark.parametrize("method", ["get", "patch"])
def test_barbeiro_inexistente(admin: TestClient, method: str) -> None:
    response = admin.request(method, "/admin/barbers/999999", json={"bio": "x"})

    assert response.status_code == 404
    assert response.json() == {
        "code": "BARBER_NOT_FOUND",
        "message": "Barbeiro não encontrado.",
    }


@pytest.mark.parametrize(
    ("method", "path", "payload"),
    [
        ("get", "/admin/barbers", None),
        ("post", "/admin/barbers", NEW_BARBER),
        ("get", "/admin/barbers/1", None),
        ("patch", "/admin/barbers/1", {"active": False}),
    ],
)
def test_rn70_so_administracao_acessa_os_barbeiros(
    customer: TestClient,
    client: TestClient,
    admin: TestClient,
    method: str,
    path: str,
    payload: object,
) -> None:
    before = admin.get("/admin/barbers").json()

    as_customer = customer.request(method, path, json=payload)
    anonymous = client.request(method, path, json=payload)

    assert as_customer.status_code == 403
    assert anonymous.status_code == 401
    assert admin.get("/admin/barbers").json() == before
