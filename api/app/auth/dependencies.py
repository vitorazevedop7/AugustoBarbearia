"""Dependências FastAPI para rotas autenticadas e administrativas (RN-70)."""

from typing import Annotated

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.exceptions import PyJWTError

from app.auth.schemas import CurrentUser
from app.auth.service import get_token_verifier

bearer = HTTPBearer(auto_error=False)


def current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> CurrentUser:
    """RN-71: autentica antes de resolver qualquer permissão."""
    if credentials is not None:
        try:
            return get_token_verifier().verify(credentials.credentials)
        except PyJWTError, ValueError, TypeError, OverflowError:
            # JWT/JWKS malformados e indisponibilidade nunca concedem acesso.
            pass
    raise HTTPException(status_code=401, headers={"WWW-Authenticate": "Bearer"})


def require_admin(user: Annotated[CurrentUser, Depends(current_user)]) -> CurrentUser:
    """RN-70/RN-71: só a administração acessa as rotas administrativas."""
    if user.role != "admin":
        raise HTTPException(status_code=403)
    return user


def require_customer(
    user: Annotated[CurrentUser, Depends(current_user)],
) -> CurrentUser:
    """RN-70/RN-71: a administração não agenda para si nem tem perfil de cliente."""
    if user.role != "customer":
        raise HTTPException(status_code=403)
    return user
