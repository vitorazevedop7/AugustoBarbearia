"""Rotas do cliente (`/me`) e o cadastro de clientes da administração (RN-70)."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import current_user, require_admin
from app.auth.schemas import CurrentUser
from app.db import get_session
from app.errors import ErrorResponse
from app.ids import Id
from app.modules.customers import service
from app.modules.customers.dependencies import current_customer
from app.modules.customers.models import Customer
from app.modules.customers.schemas import (
    CustomerCreate,
    CustomerPage,
    CustomerProfile,
    CustomerProfileUpdate,
    CustomerResponse,
    CustomerUpdate,
    Me,
)

router = APIRouter(
    tags=["customers"],
    responses={401: {"model": ErrorResponse}, 409: {"model": ErrorResponse}},
)
profile_responses: dict[int | str, dict[str, object]] = {403: {"model": ErrorResponse}}

admin_router = APIRouter(
    prefix="/admin/customers",
    tags=["Clientes"],
    dependencies=[Depends(require_admin)],
    responses={401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}},
)


@router.get("/me", response_model=Me)
def me(
    user: Annotated[CurrentUser, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> Me:
    return Me(**user.model_dump(), has_phone=service.has_phone(session, user))


@router.get("/me/profile", response_model=CustomerProfile, responses=profile_responses)
def get_profile(
    customer: Annotated[Customer, Depends(current_customer)],
) -> CustomerProfile:
    return to_profile(customer)


@router.patch(
    "/me/profile", response_model=CustomerProfile, responses=profile_responses
)
def update_profile(
    payload: CustomerProfileUpdate,
    customer: Annotated[Customer, Depends(current_customer)],
    session: Annotated[Session, Depends(get_session)],
) -> CustomerProfile:
    updated = service.update_profile(
        session, customer, name=payload.name, phone=payload.phone
    )
    return to_profile(updated)


def to_profile(customer: Customer) -> CustomerProfile:
    return CustomerProfile(
        name=customer.name, email=customer.email, phone=customer.phone
    )


def to_response(customer: Customer) -> CustomerResponse:
    return CustomerResponse(
        id=customer.id,
        name=customer.name,
        phone=customer.phone,
        email=customer.email,
        has_account=customer.auth_user_id is not None,
    )


@admin_router.get("", response_model=CustomerPage)
def search_customers(
    session: Annotated[Session, Depends(get_session)],
    q: Annotated[str | None, Query(max_length=100)] = None,
    page: Annotated[int, Query(ge=1, le=100_000)] = 1,
    page_size: Annotated[int, Query(ge=1, le=50)] = 20,
) -> CustomerPage:
    customers, total = service.search_customers(
        session, query=q, page=page, page_size=page_size
    )
    return CustomerPage(
        items=[to_response(customer) for customer in customers],
        total=total,
        page=page,
        page_size=page_size,
    )


@admin_router.post(
    "",
    response_model=CustomerResponse,
    status_code=status.HTTP_201_CREATED,
    responses={409: {"model": ErrorResponse}},
)
def create_customer(
    data: CustomerCreate,
    session: Annotated[Session, Depends(get_session)],
) -> CustomerResponse:
    return to_response(service.create_customer(session, data))


@admin_router.get(
    "/{customer_id}",
    response_model=CustomerResponse,
    responses={404: {"model": ErrorResponse}},
)
def get_customer(
    customer_id: Id,
    session: Annotated[Session, Depends(get_session)],
) -> CustomerResponse:
    return to_response(service.get_customer(session, customer_id))


@admin_router.patch(
    "/{customer_id}",
    response_model=CustomerResponse,
    responses={404: {"model": ErrorResponse}, 409: {"model": ErrorResponse}},
)
def update_customer(
    customer_id: Id,
    data: CustomerUpdate,
    session: Annotated[Session, Depends(get_session)],
) -> CustomerResponse:
    return to_response(service.update_customer(session, customer_id, data))
