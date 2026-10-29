"""Cadastro do cliente a partir da conta Google e perfil (RN-16, RN-23, RN-62)."""

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.schemas import CurrentUser
from app.errors import DomainError
from app.modules.customers.models import NAME_MAX_LENGTH, Customer


def normalize_email(email: str) -> str:
    """RN-23: e-mails iguais a menos de espaços e caixa são o mesmo cadastro."""
    return email.strip().lower()


def resolve_customer(session: Session, user: CurrentUser) -> Customer:
    """Encontra, vincula ou cria o cliente da conta autenticada.

    Procura pelo vínculo (`sub`); sem ele, vincula ao cadastro com o mesmo e-mail
    (RN-23); sem os dois, cria o cadastro com o nome e o e-mail do Google, ainda
    sem telefone (RN-62). Só para clientes: a administração não vira cliente
    (RN-71), o que as rotas garantem com `require_customer`.
    """
    customer = _find_or_link(session, user)
    if customer is not None:
        return customer
    customer = Customer(
        name=user.name.strip()[:NAME_MAX_LENGTH],
        email=normalize_email(user.email),
        auth_user_id=user.sub,
    )
    session.add(customer)
    try:
        session.commit()
    except IntegrityError:
        # Outro pedido da mesma conta criou o cadastro ao mesmo tempo: as
        # constraints únicas impedem a duplicata, e este pedido usa o que existe.
        session.rollback()
        customer = _find_or_link(session, user)
        if customer is None:
            raise
    return customer


def _find_or_link(session: Session, user: CurrentUser) -> Customer | None:
    customer = session.scalar(select(Customer).where(Customer.auth_user_id == user.sub))
    if customer is not None:
        return customer
    # FOR UPDATE: dois primeiros acessos simultâneos não vinculam duas vezes.
    customer = session.scalar(
        select(Customer)
        .where(Customer.email == normalize_email(user.email))
        .with_for_update()
    )
    if customer is None:
        return None
    if customer.auth_user_id not in (None, user.sub):
        # RN-23 só vincula cadastro sem conta; trocar o vínculo sozinho passaria
        # o cadastro (e os agendamentos) de uma conta para outra.
        raise DomainError(
            code="CUSTOMER_EMAIL_LINKED",
            message=(
                "Este e-mail já está vinculado a outro cadastro. "
                "Fale com a barbearia para resolver."
            ),
            status_code=409,
        )
    customer.auth_user_id = user.sub
    session.commit()
    return customer


def has_phone(session: Session, user: CurrentUser) -> bool:
    """RN-10: o cliente só agenda com telefone. A administração não tem cadastro
    de cliente (RN-71), então nunca tem telefone."""
    if user.role != "customer":
        return False
    return resolve_customer(session, user).phone is not None


def update_profile(
    session: Session, customer: Customer, *, name: str | None, phone: str | None
) -> Customer:
    """RN-16: altera só o cadastro da própria conta. RN-62: nome e telefone
    obrigatórios, então `None` mantém o valor atual em vez de apagá-lo."""
    if name is not None:
        customer.name = name
    if phone is not None:
        customer.phone = phone
    session.commit()
    return customer
