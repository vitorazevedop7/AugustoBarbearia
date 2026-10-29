import base64
import json
import time
from collections.abc import Iterator
from io import BytesIO
from unittest.mock import MagicMock
from urllib.error import URLError

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric.ed448 import Ed448PrivateKey
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi.testclient import TestClient
from httpx import Response
from pytest import MonkeyPatch

from app.auth.service import get_token_verifier
from app.config import get_settings
from app.main import create_app

ISSUER = "https://web.test"
AUDIENCE = "augusto-api-test"
JWKS_URL = "https://web.test/api/auth/jwks"


def public_jwk(key: Ed25519PrivateKey, kid: str = "current") -> dict[str, str]:
    return {
        "kty": "OKP",
        "crv": "Ed25519",
        "alg": "EdDSA",
        "use": "sig",
        "kid": kid,
        "x": base64.urlsafe_b64encode(key.public_key().public_bytes_raw())
        .rstrip(b"=")
        .decode(),
    }


@pytest.fixture
def private_key() -> Ed25519PrivateKey:
    return Ed25519PrivateKey.generate()


@pytest.fixture
def jwks_payload(private_key: Ed25519PrivateKey) -> dict[str, object]:
    return {"keys": [public_jwk(private_key)]}


@pytest.fixture
def jwks_http(monkeypatch: MonkeyPatch, jwks_payload: dict[str, object]) -> MagicMock:
    open_mock = MagicMock(
        side_effect=lambda *_args, **_kwargs: BytesIO(json.dumps(jwks_payload).encode())
    )
    opener = MagicMock()
    opener.open = open_mock
    monkeypatch.setattr(
        "jwt.jwks_client.urllib.request.build_opener", lambda *_: opener
    )
    return open_mock


@pytest.fixture
def auth_client(monkeypatch: MonkeyPatch, jwks_http: MagicMock) -> Iterator[TestClient]:
    monkeypatch.setenv("AUTH_JWKS_URL", JWKS_URL)
    monkeypatch.setenv("AUTH_ISSUER", ISSUER)
    monkeypatch.setenv("AUTH_AUDIENCE", AUDIENCE)
    monkeypatch.setenv("ADMIN_EMAILS", " admin@example.com , OTHER@example.com, ,")
    get_settings.cache_clear()
    get_token_verifier.cache_clear()
    try:
        with TestClient(create_app()) as client:
            yield client
    finally:
        get_token_verifier.cache_clear()
        get_settings.cache_clear()


def claims(**overrides: object) -> dict[str, object]:
    return {
        "iss": ISSUER,
        "aud": AUDIENCE,
        "iat": int(time.time()),
        "exp": int(time.time()) + 900,
        "sub": "google-user-123",
        "email": "customer@example.com",
        "name": "Cliente Teste",
        **overrides,
    }


def token(
    private_key: Ed25519PrivateKey,
    payload: dict[str, object] | None = None,
    kid: str = "current",
) -> str:
    return jwt.encode(
        claims() if payload is None else payload,
        private_key,
        algorithm="EdDSA",
        headers={"kid": kid},
    )


def bearer(value: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {value}"}


def assert_unauthorized(response: Response) -> None:
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
    assert response.json() == {
        "code": "HTTP_401",
        "message": "Entre na sua conta para continuar.",
    }


def test_rn71_token_valido_resolve_cliente_sem_banco(
    auth_client: TestClient, private_key: Ed25519PrivateKey
) -> None:
    response = auth_client.get("/me", headers=bearer(token(private_key)))
    assert response.status_code == 200
    assert response.json() == {
        "sub": "google-user-123",
        "email": "customer@example.com",
        "name": "Cliente Teste",
        "role": "customer",
    }


@pytest.mark.parametrize("email", ["admin@example.com", "OTHER@EXAMPLE.COM"])
def test_rn71_email_autorizado_acessa_administracao(
    auth_client: TestClient, private_key: Ed25519PrivateKey, email: str
) -> None:
    headers = bearer(token(private_key, claims(email=email)))
    assert auth_client.get("/me", headers=headers).json()["role"] == "admin"
    response = auth_client.get("/admin/ping", headers=headers)
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_rn71_cliente_nao_pode_forjar_papel_admin_no_token(
    auth_client: TestClient, private_key: Ed25519PrivateKey
) -> None:
    headers = bearer(token(private_key, claims(role="admin")))
    assert auth_client.get("/me", headers=headers).json()["role"] == "customer"
    response = auth_client.get("/admin/ping", headers=headers)
    assert response.status_code == 403
    assert response.json() == {
        "code": "HTTP_403",
        "message": "Você não tem permissão para realizar esta ação.",
    }


def test_rn71_lista_vazia_nao_concede_admin(
    auth_client: TestClient, private_key: Ed25519PrivateKey, monkeypatch: MonkeyPatch
) -> None:
    monkeypatch.setenv("ADMIN_EMAILS", " , ")
    get_settings.cache_clear()
    headers = bearer(token(private_key, claims(email="admin@example.com")))
    assert auth_client.get("/me", headers=headers).json()["role"] == "customer"


@pytest.mark.parametrize("path", ["/me", "/admin/ping"])
@pytest.mark.parametrize("authorization", [None, "", "Basic abc", "Bearer", "Bearer "])
def test_rn71_sem_bearer_valido_nega_sem_consultar_jwks(
    auth_client: TestClient, jwks_http: MagicMock, path: str, authorization: str | None
) -> None:
    headers = {} if authorization is None else {"Authorization": authorization}
    assert_unauthorized(auth_client.get(path, headers=headers))
    jwks_http.assert_not_called()


@pytest.mark.parametrize(
    ("claim", "value"),
    [
        ("exp", 1),
        ("exp", "9999999999"),
        ("exp", []),
        ("exp", float("inf")),
        ("iss", "https://attacker.test"),
        ("aud", "other-api"),
        ("aud", []),
        ("iat", 9999999999),
        ("nbf", 9999999999),
        ("sub", 123),
        ("sub", ""),
        ("email", []),
        ("email", ""),
        ("name", None),
        ("name", "   "),
    ],
)
def test_rn71_claim_invalido_nega_acesso(
    auth_client: TestClient,
    private_key: Ed25519PrivateKey,
    claim: str,
    value: object,
) -> None:
    headers = bearer(token(private_key, claims(**{claim: value})))
    assert_unauthorized(auth_client.get("/me", headers=headers))


@pytest.mark.parametrize("claim", ["iss", "aud", "exp", "sub", "email", "name"])
def test_rn71_claim_obrigatorio_ausente_nega_acesso(
    auth_client: TestClient, private_key: Ed25519PrivateKey, claim: str
) -> None:
    payload = claims()
    del payload[claim]
    assert_unauthorized(
        auth_client.get("/me", headers=bearer(token(private_key, payload)))
    )


def test_rn71_assinatura_errada_nega_acesso(auth_client: TestClient) -> None:
    forged = token(Ed25519PrivateKey.generate())
    assert_unauthorized(auth_client.get("/me", headers=bearer(forged)))


@pytest.mark.parametrize("algorithm", ["HS256", "none"])
def test_rn71_algoritmo_nao_permitido_nega_sem_consultar_jwks(
    auth_client: TestClient, jwks_http: MagicMock, algorithm: str
) -> None:
    forged = jwt.encode(
        claims(),
        "a" * 32 if algorithm == "HS256" else "",
        algorithm=algorithm,
        headers={"kid": "current"},
    )
    assert_unauthorized(auth_client.get("/me", headers=bearer(forged)))
    jwks_http.assert_not_called()


@pytest.mark.parametrize(
    "invalid_token", ["broken", "a.b.c", "eyJhbGciOiJFZERTQSJ9.e30."]
)
def test_rn71_token_malformado_nega_acesso(
    auth_client: TestClient, invalid_token: str
) -> None:
    assert_unauthorized(auth_client.get("/me", headers=bearer(invalid_token)))


def test_rn71_kid_ausente_nega_acesso(
    auth_client: TestClient, private_key: Ed25519PrivateKey, jwks_http: MagicMock
) -> None:
    value = jwt.encode(claims(), private_key, algorithm="EdDSA")
    assert_unauthorized(auth_client.get("/me", headers=bearer(value)))
    jwks_http.assert_not_called()


@pytest.mark.parametrize("kid", [42, [], {}, None, ""])
def test_rn71_kid_malformado_nega_sem_consultar_jwks(
    auth_client: TestClient,
    private_key: Ed25519PrivateKey,
    jwks_http: MagicMock,
    kid: object,
) -> None:
    parts = token(private_key).split(".")
    parts[0] = (
        base64.urlsafe_b64encode(json.dumps({"alg": "EdDSA", "kid": kid}).encode())
        .rstrip(b"=")
        .decode()
    )
    assert_unauthorized(auth_client.get("/me", headers=bearer(".".join(parts))))
    jwks_http.assert_not_called()


def test_rn71_cache_reutiliza_jwks_e_ignora_url_no_token(
    auth_client: TestClient, private_key: Ed25519PrivateKey, jwks_http: MagicMock
) -> None:
    value = jwt.encode(
        claims(),
        private_key,
        algorithm="EdDSA",
        headers={"kid": "current", "jku": "https://attacker.test/jwks"},
    )
    for _ in range(2):
        assert auth_client.get("/me", headers=bearer(value)).status_code == 200
    jwks_http.assert_called_once()
    assert jwks_http.call_args.args[0].full_url == JWKS_URL
    assert jwks_http.call_args.kwargs["timeout"] == 5


def test_rn71_kid_novo_atualiza_jwks_imediatamente(
    auth_client: TestClient,
    private_key: Ed25519PrivateKey,
    jwks_payload: dict[str, object],
    jwks_http: MagicMock,
) -> None:
    assert auth_client.get("/me", headers=bearer(token(private_key))).status_code == 200
    rotated_key = Ed25519PrivateKey.generate()
    jwks_payload["keys"] = [public_jwk(rotated_key, "rotated")]
    response = auth_client.get("/me", headers=bearer(token(rotated_key, kid="rotated")))
    assert response.status_code == 200
    assert jwks_http.call_count == 2


def test_rn71_kid_desconhecido_nega_depois_de_atualizar_jwks(
    auth_client: TestClient, private_key: Ed25519PrivateKey, jwks_http: MagicMock
) -> None:
    assert_unauthorized(
        auth_client.get("/me", headers=bearer(token(private_key, kid="unknown")))
    )
    assert jwks_http.call_count == 2


def test_rn71_cache_expirado_nao_aceita_chave_removida(
    auth_client: TestClient,
    private_key: Ed25519PrivateKey,
    jwks_payload: dict[str, object],
    jwks_http: MagicMock,
    monkeypatch: MonkeyPatch,
) -> None:
    headers = bearer(token(private_key))
    assert auth_client.get("/me", headers=headers).status_code == 200
    cache = get_token_verifier().jwks.jwk_set_cache
    assert cache is not None
    assert cache.lifespan == 300
    monkeypatch.setattr(cache, "is_expired", lambda: True)
    jwks_payload["keys"] = [public_jwk(Ed25519PrivateKey.generate(), "new")]
    assert_unauthorized(auth_client.get("/me", headers=headers))
    assert jwks_http.call_count == 3


@pytest.mark.parametrize(
    "failure",
    [URLError("indisponível"), TimeoutError(), ValueError("JSON inválido")],
)
def test_rn71_falha_jwks_nega_sem_expor_detalhes(
    auth_client: TestClient,
    private_key: Ed25519PrivateKey,
    jwks_http: MagicMock,
    failure: Exception,
) -> None:
    jwks_http.side_effect = failure
    assert_unauthorized(auth_client.get("/me", headers=bearer(token(private_key))))


@pytest.mark.parametrize("invalid_keys", [None, "invalid", [], [{}], [42]])
def test_rn71_jwks_malformado_nega_acesso(
    auth_client: TestClient,
    private_key: Ed25519PrivateKey,
    jwks_payload: dict[str, object],
    invalid_keys: object,
) -> None:
    jwks_payload["keys"] = invalid_keys
    assert_unauthorized(auth_client.get("/me", headers=bearer(token(private_key))))


@pytest.mark.parametrize("body", [b"{", b"null", b"[]"])
def test_rn71_resposta_jwks_nao_e_objeto_json_valido(
    auth_client: TestClient,
    private_key: Ed25519PrivateKey,
    jwks_http: MagicMock,
    body: bytes,
) -> None:
    jwks_http.side_effect = lambda *_args, **_kwargs: BytesIO(body)
    assert_unauthorized(auth_client.get("/me", headers=bearer(token(private_key))))


def test_rn71_eddsa_com_ed448_nao_e_aceito(
    auth_client: TestClient, jwks_payload: dict[str, object]
) -> None:
    key = Ed448PrivateKey.generate()
    jwks_payload["keys"] = [
        {
            "kty": "OKP",
            "crv": "Ed448",
            "alg": "EdDSA",
            "kid": "current",
            "x": base64.urlsafe_b64encode(key.public_key().public_bytes_raw())
            .rstrip(b"=")
            .decode(),
        }
    ]
    value = jwt.encode(claims(), key, algorithm="EdDSA", headers={"kid": "current"})
    assert_unauthorized(auth_client.get("/me", headers=bearer(value)))


def test_rn71_openapi_documenta_bearer_identidade_e_erros(
    auth_client: TestClient,
) -> None:
    spec = auth_client.get("/openapi.json").json()
    assert spec["components"]["securitySchemes"]["HTTPBearer"]["scheme"] == "bearer"
    for path in ["/me", "/admin/ping"]:
        operation = spec["paths"][path]["get"]
        assert operation["security"] == [{"HTTPBearer": []}]
        assert "401" in operation["responses"]
    assert "403" in spec["paths"]["/admin/ping"]["get"]["responses"]
    user = spec["components"]["schemas"]["CurrentUser"]
    assert set(user["required"]) == {"sub", "email", "name", "role"}
    assert user["properties"]["role"]["enum"] == ["admin", "customer"]
