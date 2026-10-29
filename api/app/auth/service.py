"""Validação do JWT e resolução de papel (ADR 0003, RN-70 e RN-71)."""

from functools import lru_cache

import jwt
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from jwt import PyJWKClient
from jwt.exceptions import InvalidTokenError

from app.auth.schemas import CurrentUser, TokenIdentity
from app.config import Settings, get_settings


class TokenVerifier:
    def __init__(self, settings: Settings) -> None:
        self.issuer = settings.auth_issuer
        self.audience = settings.auth_audience
        self.admin_emails = {
            email.strip().casefold()
            for email in settings.admin_emails.split(",")
            if email.strip()
        }
        # O cache do conjunto expira; cache individual perpetuaria chaves removidas.
        self.jwks = PyJWKClient(
            settings.auth_jwks_url,
            cache_keys=False,
            cache_jwk_set=True,
            lifespan=300,
            timeout=5,
            cooldown_duration=0,
        )

    def verify(self, token: str) -> CurrentUser:
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        if header.get("alg") != "EdDSA" or not isinstance(kid, str) or not kid:
            raise InvalidTokenError("Algoritmo ou identificador de chave inválido.")

        # Só a URL configurada é consultada; jku/jwk do token não são confiáveis.
        signing_key = self.jwks.get_signing_key(kid)
        key = signing_key.key
        if not isinstance(key, Ed25519PublicKey):
            raise InvalidTokenError("A chave precisa ser Ed25519.")

        claims = jwt.decode(
            token,
            key,
            algorithms=["EdDSA"],
            issuer=self.issuer,
            audience=self.audience,
            options={"require": ["iss", "aud", "exp", "sub", "email", "name"]},
        )
        # NumericDate é numérico; PyJWT também aceita strings convertíveis em int.
        if type(claims["exp"]) not in (int, float):
            raise InvalidTokenError("Expiração inválida.")
        identity = TokenIdentity.model_validate(claims)
        # RN-71: somente a lista da API concede administração, nunca o token.
        role = (
            "admin"
            if identity.email.strip().casefold() in self.admin_emails
            else "customer"
        )
        return CurrentUser(**identity.model_dump(), role=role)


@lru_cache
def get_token_verifier() -> TokenVerifier:
    """Compartilha o cache JWKS entre requisições do processo."""
    return TokenVerifier(get_settings())
