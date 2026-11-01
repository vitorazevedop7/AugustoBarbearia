"""Cadastro do cliente: pela conta Google, pelo perfil e pela administração.

Regras: RN-16, RN-20, RN-23 e RN-62.
"""

import re
from collections.abc import Sequence

import psycopg.errors
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.schemas import CurrentUser
from app.errors import DomainError
from app.modules.customers.models import NAME_MAX_LENGTH, Customer
from app.modules.customers.schemas import (
    CustomerCreate,
    CustomerUpdate,
    normalize_email,
)

EMAIL_CONSTRAINT = "uq_customers_email"
# Um texto só com dígitos e separadores de telefone também busca pelo telefone.
PHONE_SEARCH = re.compile(r"[\d\s().+-]+")


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


def email_taken() -> DomainError:
    return DomainError(
        code="CUSTOMER_EMAIL_TAKEN",
        message="Já existe um cliente cadastrado com este e-mail.",
        status_code=409,
    )


def commit_customer(session: Session) -> None:
    """Grava o cadastro; e-mail repetido vira `409`, inclusive quando outra
    transação grava o mesmo e-mail entre a checagem e o insert (RN-23)."""
    try:
        session.commit()
    except IntegrityError as error:
        session.rollback()
        original = error.orig
        if (
            isinstance(original, psycopg.errors.UniqueViolation)
            and original.diag.constraint_name == EMAIL_CONSTRAINT
        ):
            raise email_taken() from error
        raise


def create_customer(session: Session, data: CustomerCreate) -> Customer:
    """RN-20: a administração cadastra um cliente sem conta, com nome e telefone
    obrigatórios (RN-62) e e-mail opcional. O e-mail já chega normalizado; se um
    dia esse cliente entrar com o Google, o login o vincula (RN-23).

    Outros módulos (o agendamento manual) criam clientes por aqui.
    """
    customer = Customer(name=data.name, phone=data.phone, email=data.email)
    session.add(customer)
    commit_customer(session)
    return customer


def get_customer(session: Session, customer_id: int, *, lock: bool = False) -> Customer:
    """`lock` trava a linha (`FOR UPDATE`) e relê o banco, para a edição não
    correr junto com o vínculo da conta Google (RN-23)."""
    customer = session.get(
        Customer,
        customer_id,
        with_for_update=lock or None,
        populate_existing=lock,
    )
    if customer is None:
        raise DomainError(
            code="CUSTOMER_NOT_FOUND",
            message="Cliente não encontrado.",
            status_code=404,
        )
    return customer


def search_customers(
    session: Session, *, query: str | None, page: int, page_size: int
) -> tuple[Sequence[Customer], int]:
    """Clientes cujo nome ou e-mail contém `query` ou, se `query` só tem dígitos
    e separadores, cujo telefone contém esses dígitos. Sem `query`, todos.

    Devolve a página e o total que casa com a busca. Os curingas do `LIKE` valem
    como texto (`autoescape`).
    """
    statement = select(Customer)
    term = (query or "").strip()
    if term:
        conditions = [
            Customer.name.icontains(term, autoescape=True),
            Customer.email.icontains(term, autoescape=True),
        ]
        if PHONE_SEARCH.fullmatch(term):
            digits = re.sub(r"\D", "", term.removeprefix("+55"))
            if digits:
                conditions.append(Customer.phone.contains(digits, autoescape=True))
        statement = statement.where(or_(*conditions))
    total = session.scalar(select(func.count()).select_from(statement.subquery()))
    customers = session.scalars(
        statement.order_by(func.lower(Customer.name), Customer.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return customers, total or 0


def update_customer(
    session: Session, customer_id: int, data: CustomerUpdate
) -> Customer:
    """Altera só o que foi enviado. RN-62: nome e telefone são obrigatórios,
    então `None` mantém o valor. O e-mail de quem tem conta Google é o que o
    Google confirmou: não muda pela administração (RN-23)."""
    customer = get_customer(session, customer_id, lock=True)
    if "email" in data.model_fields_set and data.email != customer.email:
        if customer.auth_user_id is not None:
            raise DomainError(
                code="CUSTOMER_EMAIL_LOCKED",
                message=(
                    "O e-mail deste cliente vem da conta Google e não pode ser "
                    "alterado."
                ),
                status_code=409,
            )
        customer.email = data.email
    if data.name is not None:
        customer.name = data.name
    if data.phone is not None:
        customer.phone = data.phone
    commit_customer(session)
    return customer
