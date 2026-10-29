"""Tokens e JWKS locais para testar a autenticação sem web nem Google."""

import base64
import time

import jwt
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

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
