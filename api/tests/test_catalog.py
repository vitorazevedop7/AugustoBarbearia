from decimal import Decimal
from pathlib import Path

import pytest
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from alembic import command

OWNERS = ["Edvaldo", "Lauro", "Manoel"]


def barber_ids(admin: TestClient) -> dict[str, int]:
    return {
        barber["name"]: barber["id"] for barber in admin.get("/admin/barbers").json()
    }


def new_service(admin: TestClient, **changes: object) -> dict[str, object]:
    ids = barber_ids(admin)
    return {
        "name": "  Pigmentação  ",
        "description": "Disfarça falhas na barba.",
        "price": "40.50",
        "duration_minutes": 20,
        "barber_ids": [ids["Lauro"], ids["Edvaldo"]],
        **changes,
    }


def create(admin: TestClient, **changes: object) -> dict[str, object]:
    response = admin.post("/admin/services", json=new_service(admin, **changes))
    assert response.status_code == 201, response.json()
    return response.json()


def names(service: dict[str, object]) -> list[str]:
    barbers = service["barbers"]
    assert isinstance(barbers, list)
    return [barber["name"] for barber in barbers]


def test_rn63_servicos_iniciais_feitos_pelos_tres_proprietarios(
    admin: TestClient,
) -> None:
    response = admin.get("/admin/services")

    assert response.status_code == 200
    assert [
        {
            key: service[key]
            for key in ("name", "description", "price", "duration_minutes", "active")
        }
        | {"barbers": names(service)}
        for service in response.json()
    ] == [
        {
            "name": "Corte + Barba",
            "description": None,
            "price": "35.00",
            "duration_minutes": 45,
            "active": True,
            "barbers": OWNERS,
        },
        {
            "name": "Corte Simples",
            "description": None,
            "price": "25.00",
            "duration_minutes": 30,
            "active": True,
            "barbers": OWNERS,
        },
    ]


def test_rn61_cria_servico_ativo_com_os_barbeiros(admin: TestClient) -> None:
    ids = barber_ids(admin)

    created = create(admin)

    assert created == {
        "id": created["id"],
        "name": "Pigmentação",
        "description": "Disfarça falhas na barba.",
        "price": "40.50",
        "duration_minutes": 20,
        "active": True,
        "barbers": [
            {"id": ids["Edvaldo"], "name": "Edvaldo", "active": True},
            {"id": ids["Lauro"], "name": "Lauro", "active": True},
        ],
    }
    assert admin.get(f"/admin/services/{created['id']}").json() == created
    assert created in admin.get("/admin/services").json()


@pytest.mark.parametrize(
    ("price", "expected"),
    [
        ("25", "25.00"),
        ("25,5", "25.50"),
        (" 1.234,56 ", "1234.56"),
        ("0", "0.00"),
        (30, "30.00"),
        ("25.50", "25.50"),
        ("25.5", "25.50"),
        ("1.000,00", "1000.00"),
        ("1000,00", "1000.00"),
        ("1.000.000,00", "1000000.00"),
        ("99999999.99", "99999999.99"),
    ],
)
@pytest.mark.parametrize("method", ["post", "patch"])
def test_rn61_preco_em_decimal_com_duas_casas(
    admin: TestClient, price: object, expected: str, method: str
) -> None:
    if method == "post":
        response = admin.post("/admin/services", json=new_service(admin, price=price))
        assert response.status_code == 201
    else:
        existing = create(admin)
        response = admin.patch(
            f"/admin/services/{existing['id']}", json={"price": price}
        )
        assert response.status_code == 200

    saved = response.json()
    assert saved["price"] == expected
    assert admin.get(f"/admin/services/{saved['id']}").json()["price"] == expected


@pytest.mark.parametrize("method", ["post", "patch"])
@pytest.mark.parametrize("price", [25.5, 0.0099999999999999999, -1e-999, 0.0])
def test_rn61_numero_json_com_casas_decimais_e_recusado_sem_float(
    admin: TestClient, method: str, price: float
) -> None:
    path = "/admin/services"
    payload = new_service(admin, price=price)
    if method == "patch":
        existing = create(admin)
        path = f"{path}/{existing['id']}"
        payload = {"price": price}
    before = admin.get("/admin/services").json()

    response = admin.request(method, path, json=payload)

    assert response.status_code == 422
    assert response.json() == {
        "code": "VALIDATION_ERROR",
        "message": "Confira o preço.",
    }
    assert admin.get("/admin/services").json() == before


def test_rn61_descricao_e_opcional(admin: TestClient) -> None:
    assert create(admin, description="   ")["description"] is None
    assert create(admin, description=None)["description"] is None
    assert create(admin, description="a" * 400)["description"] == "a" * 400


def test_rn61_barbeiro_repetido_conta_uma_vez(admin: TestClient) -> None:
    lauro = barber_ids(admin)["Lauro"]

    assert names(create(admin, barber_ids=[lauro, lauro])) == ["Lauro"]


@pytest.mark.parametrize(
    ("change", "code", "message"),
    [
        (
            {"duration_minutes": 32},
            "INVALID_SERVICE_DURATION",
            "A duração precisa ser de no mínimo 10 minutos, em múltiplos de 5.",
        ),
        (
            {"duration_minutes": 5},
            "INVALID_SERVICE_DURATION",
            "A duração precisa ser de no mínimo 10 minutos, em múltiplos de 5.",
        ),
        (
            {"duration_minutes": 0},
            "INVALID_SERVICE_DURATION",
            "A duração precisa ser de no mínimo 10 minutos, em múltiplos de 5.",
        ),
        (
            {"duration_minutes": -30},
            "INVALID_SERVICE_DURATION",
            "A duração precisa ser de no mínimo 10 minutos, em múltiplos de 5.",
        ),
        (
            {"price": "-0,01"},
            "INVALID_SERVICE_PRICE",
            "O preço não pode ser negativo.",
        ),
        (
            {"barber_ids": []},
            "SERVICE_WITHOUT_BARBER",
            "Escolha pelo menos um barbeiro para o serviço.",
        ),
        (
            {"barber_ids": [999999]},
            "UNKNOWN_BARBER",
            "Um dos barbeiros escolhidos não existe mais. "
            "Recarregue a página e tente de novo.",
        ),
    ],
)
def test_rn61_regras_do_servico_ao_criar(
    admin: TestClient, change: dict[str, object], code: str, message: str
) -> None:
    before = admin.get("/admin/services").json()

    response = admin.post("/admin/services", json=new_service(admin, **change))

    assert response.status_code == 422
    assert response.json() == {"code": code, "message": message}
    assert admin.get("/admin/services").json() == before


def test_rn61_duracao_minima_de_10_minutos_e_aceita(admin: TestClient) -> None:
    assert create(admin, duration_minutes=10)["duration_minutes"] == 10
    assert create(admin, duration_minutes=1440)["duration_minutes"] == 1440


@pytest.mark.parametrize(
    "change",
    [
        {"name": "   "},
        {"name": "a" * 81},
        {"description": "a" * 401},
        {"price": "25.001"},
        {"price": "vinte"},
        {"price": ""},
        {"price": "NaN"},
        {"price": "100000000.00"},
        {"duration_minutes": 1445},
        {"duration_minutes": 30.5},
        {"barber_ids": "1"},
    ],
)
def test_rn61_formato_dos_campos(admin: TestClient, change: dict[str, object]) -> None:
    before = admin.get("/admin/services").json()

    response = admin.post("/admin/services", json=new_service(admin, **change))

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"
    assert admin.get("/admin/services").json() == before


@pytest.mark.parametrize("missing", ["name", "price", "duration_minutes", "barber_ids"])
def test_rn61_cadastro_exige_os_campos_obrigatorios(
    admin: TestClient, missing: str
) -> None:
    payload = new_service(admin)
    del payload[missing]

    response = admin.post("/admin/services", json=payload)

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"


def test_rn61_edicao_altera_so_os_campos_enviados(admin: TestClient) -> None:
    created = create(admin)

    response = admin.patch(
        f"/admin/services/{created['id']}",
        json={"price": "45,00", "duration_minutes": 25},
    )

    assert response.status_code == 200
    assert response.json() == {**created, "price": "45.00", "duration_minutes": 25}


def test_rn61_edicao_troca_os_barbeiros(admin: TestClient) -> None:
    created = create(admin)
    manoel = barber_ids(admin)["Manoel"]

    response = admin.patch(
        f"/admin/services/{created['id']}", json={"barber_ids": [manoel]}
    )

    assert response.status_code == 200
    assert names(response.json()) == ["Manoel"]
    assert names(admin.get(f"/admin/services/{created['id']}").json()) == ["Manoel"]


def test_rn61_edicao_remove_a_descricao(admin: TestClient) -> None:
    created = create(admin)

    for description in ("", None):
        response = admin.patch(
            f"/admin/services/{created['id']}", json={"description": description}
        )
        assert response.status_code == 200
        assert response.json() == {**created, "description": None}


@pytest.mark.parametrize(
    ("change", "code"),
    [
        ({"duration_minutes": 42}, "INVALID_SERVICE_DURATION"),
        ({"price": "-1"}, "INVALID_SERVICE_PRICE"),
        ({"barber_ids": []}, "SERVICE_WITHOUT_BARBER"),
        ({"barber_ids": [999999]}, "UNKNOWN_BARBER"),
        ({"name": None}, "VALIDATION_ERROR"),
        ({"name": ""}, "VALIDATION_ERROR"),
        ({"price": None}, "VALIDATION_ERROR"),
        ({"duration_minutes": None}, "VALIDATION_ERROR"),
        ({"barber_ids": None}, "VALIDATION_ERROR"),
        ({"active": None}, "VALIDATION_ERROR"),
    ],
)
def test_rn61_edicao_valida_os_campos(
    admin: TestClient, change: dict[str, object], code: str
) -> None:
    created = create(admin)

    # O preço válido vai junto para provar que nada é gravado pela metade.
    response = admin.patch(
        f"/admin/services/{created['id']}", json={"price": "99.00", **change}
    )

    assert response.status_code == 422
    assert response.json()["code"] == code
    assert admin.get(f"/admin/services/{created['id']}").json() == created


def test_rn61_inativa_e_reativa_sem_excluir(admin: TestClient) -> None:
    created = create(admin, name="Sobrancelha")
    path = f"/admin/services/{created['id']}"

    inactive = admin.patch(path, json={"active": False})
    listed = admin.get("/admin/services").json()

    assert inactive.status_code == 200
    assert inactive.json() == {**created, "active": False}
    # Os inativos continuam na lista, depois dos ativos.
    assert listed[-1] == inactive.json()

    active = admin.patch(path, json={"active": True})

    assert active.status_code == 200
    assert active.json() == created


def test_rn61_servico_nao_tem_exclusao(admin: TestClient) -> None:
    created = create(admin)

    response = admin.delete(f"/admin/services/{created['id']}")

    assert response.status_code == 405
    assert admin.get(f"/admin/services/{created['id']}").json() == created


def test_rn61_lista_ativos_primeiro_e_depois_por_nome(admin: TestClient) -> None:
    corte_barba = admin.get("/admin/services").json()[0]
    admin.patch(f"/admin/services/{corte_barba['id']}", json={"active": False})
    create(admin, name="Barba")

    listed = [service["name"] for service in admin.get("/admin/services").json()]

    assert listed == ["Barba", "Corte Simples", "Corte + Barba"]


def test_rn61_barbeiro_inativo_continua_ligado_ao_servico(admin: TestClient) -> None:
    ids = barber_ids(admin)
    admin.patch(f"/admin/barbers/{ids['Lauro']}", json={"active": False})

    created = create(admin, barber_ids=[ids["Lauro"]])

    assert created["barbers"] == [
        {"id": ids["Lauro"], "name": "Lauro", "active": False}
    ]


@pytest.mark.parametrize(
    ("column", "value"),
    [("price", Decimal("-1")), ("duration_minutes", 7), ("duration_minutes", 5)],
)
def test_rn61_banco_recusa_preco_e_duracao_invalidos(
    db_session: Session, column: str, value: object
) -> None:
    values = {"price": Decimal("10"), "duration_minutes": 30, column: value}

    with pytest.raises(IntegrityError):
        db_session.execute(
            text(
                "INSERT INTO services (name, price, duration_minutes)"
                " VALUES ('Teste', :price, :duration_minutes)"
            ),
            values,
        )


@pytest.mark.parametrize("method", ["get", "patch"])
def test_servico_inexistente(admin: TestClient, method: str) -> None:
    response = admin.request(method, "/admin/services/999999", json={"active": True})

    assert response.status_code == 404
    assert response.json() == {
        "code": "SERVICE_NOT_FOUND",
        "message": "Serviço não encontrado.",
    }


@pytest.mark.parametrize(
    ("method", "path", "payload"),
    [
        ("get", "/admin/services", None),
        (
            "post",
            "/admin/services",
            {"name": "X", "price": "1", "duration_minutes": 10, "barber_ids": [1]},
        ),
        ("get", "/admin/services/1", None),
        ("patch", "/admin/services/1", {"active": False}),
    ],
)
def test_rn70_so_administracao_acessa_os_servicos(
    customer: TestClient,
    client: TestClient,
    admin: TestClient,
    method: str,
    path: str,
    payload: object,
) -> None:
    before = admin.get("/admin/services").json()

    as_customer = customer.request(method, path, json=payload)
    anonymous = client.request(method, path, json=payload)

    assert as_customer.status_code == 403
    assert anonymous.status_code == 401
    assert admin.get("/admin/services").json() == before


def test_rn63_migracao_liga_os_proprietarios_mesmo_renomeados(
    db_session: Session,
) -> None:
    # A administração já edita barbeiros antes da 0005 rodar em produção.
    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    config.attributes["connection"] = db_session.connection()
    command.downgrade(config, "0004")
    owner_ids = db_session.scalars(text("SELECT id FROM barbers ORDER BY id")).all()
    db_session.execute(text("UPDATE barbers SET name = name || ' Augusto'"))
    db_session.execute(text("INSERT INTO barbers (name) VALUES ('Novo')"))

    command.upgrade(config, "0005")

    linked = db_session.execute(
        text(
            "SELECT services.name, barber_services.barber_id FROM barber_services"
            " JOIN services ON services.id = barber_services.service_id"
            " ORDER BY services.name, barber_services.barber_id"
        )
    ).all()
    assert [tuple(row) for row in linked] == [
        (service, barber_id)
        for service in ("Corte + Barba", "Corte Simples")
        for barber_id in owner_ids
    ]


@pytest.mark.parametrize(
    "price",
    [
        "1.000",
        "1.500",
        "25.5000",
        "1,000.00",
        "1e3",
        "٣",
        "1.234",
        "25,505",
        "1.00,00",
        "",
        "R$ 25",
    ],
)
@pytest.mark.parametrize("method", ["post", "patch"])
def test_rn61_formato_que_mudaria_o_valor_e_recusado(
    admin: TestClient, price: str, method: str
) -> None:
    """#146: "1.000" é mil em pt-BR, mas viraria R$ 1,00. Tudo o que muda o
    valor em silêncio é recusado com a mensagem dos formatos aceitos."""
    path = "/admin/services"
    payload = new_service(admin, price=price)
    if method == "patch":
        existing = create(admin)
        path = f"{path}/{existing['id']}"
        payload = {"price": price}
    before = admin.get("/admin/services").json()

    response = admin.request(method, path, json=payload)

    assert response.status_code == 422
    assert response.json() == {
        "code": "VALIDATION_ERROR",
        "message": (
            "Informe o valor em reais com até duas casas decimais, "
            "como 25, 25,50 ou 1.000,00."
        ),
    }
    assert admin.get("/admin/services").json() == before
