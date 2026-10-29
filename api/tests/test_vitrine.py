"""Rotas públicas da vitrine: serviços e barbeiros ativos (S3.05)."""

import pytest
from fastapi.testclient import TestClient

OWNERS = ["Edvaldo", "Lauro", "Manoel"]


def barber_ids(admin: TestClient) -> dict[str, int]:
    return {
        barber["name"]: barber["id"] for barber in admin.get("/admin/barbers").json()
    }


def service_ids(admin: TestClient) -> dict[str, int]:
    return {
        service["name"]: service["id"]
        for service in admin.get("/admin/services").json()
    }


def create_barber(admin: TestClient, **changes: object) -> dict[str, object]:
    response = admin.post("/admin/barbers", json={"name": "Zeca", **changes})
    assert response.status_code == 201, response.json()
    return response.json()


def create_service(
    admin: TestClient, barbers: list[str], **changes: object
) -> dict[str, object]:
    ids = barber_ids(admin)
    payload = {
        "name": "Pigmentação",
        "description": "Disfarça falhas na barba.",
        "price": "40.50",
        "duration_minutes": 20,
        "barber_ids": [ids[name] for name in barbers],
        **changes,
    }
    response = admin.post("/admin/services", json=payload)
    assert response.status_code == 201, response.json()
    return response.json()


def set_active(admin: TestClient, kind: str, item_id: int, active: bool) -> None:
    response = admin.patch(f"/admin/{kind}/{item_id}", json={"active": active})
    assert response.status_code == 200, response.json()


def public_service_names(client: TestClient) -> list[str]:
    return [service["name"] for service in client.get("/public/services").json()]


def public_barber_names(client: TestClient) -> list[str]:
    return [barber["name"] for barber in client.get("/public/barbers").json()]


def test_rn70_visitante_ve_os_servicos_sem_login(client: TestClient) -> None:
    response = client.get("/public/services")

    assert response.status_code == 200
    ids = {barber["name"]: barber["id"] for barber in response.json()[0]["barbers"]}
    owners = [{"id": ids[name], "name": name} for name in OWNERS]
    assert [
        {key: value for key, value in service.items() if key != "id"}
        for service in response.json()
    ] == [
        {
            "name": "Corte + Barba",
            "description": None,
            "price": "35.00",
            "duration_minutes": 45,
            "barbers": owners,
        },
        {
            "name": "Corte Simples",
            "description": None,
            "price": "25.00",
            "duration_minutes": 30,
            "barbers": owners,
        },
    ]


def test_rn61_servico_publico_traz_os_dados_da_vitrine(
    client: TestClient, admin: TestClient
) -> None:
    created = create_service(admin, ["Lauro", "Edvaldo"], name="Barba")
    ids = barber_ids(admin)

    listed = client.get("/public/services").json()

    assert listed[0] == {
        "id": created["id"],
        "name": "Barba",
        "description": "Disfarça falhas na barba.",
        "price": "40.50",
        "duration_minutes": 20,
        "barbers": [
            {"id": ids["Edvaldo"], "name": "Edvaldo"},
            {"id": ids["Lauro"], "name": "Lauro"},
        ],
    }


def test_rn61_servico_inativo_some_da_vitrine(
    client: TestClient, admin: TestClient
) -> None:
    corte = service_ids(admin)["Corte Simples"]

    set_active(admin, "services", corte, False)
    assert public_service_names(client) == ["Corte + Barba"]

    set_active(admin, "services", corte, True)
    assert public_service_names(client) == ["Corte + Barba", "Corte Simples"]


def test_rn60_barbeiro_inativo_some_da_lista_do_servico(
    client: TestClient, admin: TestClient
) -> None:
    set_active(admin, "barbers", barber_ids(admin)["Lauro"], False)

    listed = client.get("/public/services").json()

    for service in listed:
        assert [barber["name"] for barber in service["barbers"]] == [
            "Edvaldo",
            "Manoel",
        ]


def test_rn05_servico_sem_barbeiro_ativo_nao_aparece(
    client: TestClient, admin: TestClient
) -> None:
    create_service(admin, ["Lauro", "Manoel"], name="Barba")
    ids = barber_ids(admin)

    set_active(admin, "barbers", ids["Lauro"], False)
    assert "Barba" in public_service_names(client)

    set_active(admin, "barbers", ids["Manoel"], False)
    assert public_service_names(client) == ["Corte + Barba", "Corte Simples"]
    # Continua ativo no cadastro: só não é oferecido enquanto ninguém o realiza.
    assert admin.get("/admin/services").json()[0]["active"] is True

    set_active(admin, "barbers", ids["Lauro"], True)
    assert "Barba" in public_service_names(client)


def test_rn61_servicos_publicos_por_nome(client: TestClient, admin: TestClient) -> None:
    create_service(admin, ["Lauro"], name="Acabamento")
    create_service(admin, ["Lauro"], name="Sobrancelha")

    assert public_service_names(client) == [
        "Acabamento",
        "Corte + Barba",
        "Corte Simples",
        "Sobrancelha",
    ]


def test_rn70_visitante_ve_os_barbeiros_sem_login(client: TestClient) -> None:
    response = client.get("/public/barbers")

    assert response.status_code == 200
    assert [
        {key: value for key, value in barber.items() if key != "id"}
        for barber in response.json()
    ] == [{"name": name, "photo_path": None, "bio": None} for name in OWNERS]


def test_rn60_barbeiro_publico_traz_foto_e_apresentacao(
    client: TestClient, admin: TestClient
) -> None:
    created = create_barber(
        admin,
        name="Bruno",
        photo_path="/images/barbeiros/bruno.jpg",
        bio="Corte clássico e barba.",
    )

    listed = client.get("/public/barbers").json()

    assert listed[0] == {
        "id": created["id"],
        "name": "Bruno",
        "photo_path": "/images/barbeiros/bruno.jpg",
        "bio": "Corte clássico e barba.",
    }


def test_rn60_barbeiro_inativo_some_da_vitrine(
    client: TestClient, admin: TestClient
) -> None:
    lauro = barber_ids(admin)["Lauro"]

    set_active(admin, "barbers", lauro, False)
    assert public_barber_names(client) == ["Edvaldo", "Manoel"]

    set_active(admin, "barbers", lauro, True)
    assert public_barber_names(client) == OWNERS


def test_rn60_barbeiro_ativo_sem_servico_aparece(
    client: TestClient, admin: TestClient
) -> None:
    create_barber(admin, name="Zeca")

    assert public_barber_names(client) == [*OWNERS, "Zeca"]


@pytest.mark.parametrize("path", ["/public/services", "/public/barbers"])
@pytest.mark.parametrize("method", ["post", "patch", "put", "delete"])
def test_rn70_vitrine_e_so_leitura(
    client: TestClient, admin: TestClient, path: str, method: str
) -> None:
    before = client.get(path).json()

    response = client.request(method, path, json={"name": "X"})
    as_admin = admin.request(method, path, json={"name": "X"})

    assert response.status_code == 405
    assert as_admin.status_code == 405
    assert client.get(path).json() == before
