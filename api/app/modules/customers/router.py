"""Rotas `/me`: identidade e perfil do cliente."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import current_user
from app.auth.schemas import CurrentUser
from app.db import get_session
from app.errors import ErrorResponse
from app.modules.customers import service
from app.modules.customers.dependencies import current_customer
from app.modules.customers.models import Customer
from app.modules.customers.schemas import CustomerProfile, CustomerProfileUpdate, Me

router = APIRouter(
    tags=["customers"],
    responses={401: {"model": ErrorResponse}, 409: {"model": ErrorResponse}},
)
profile_responses: dict[int | str, dict[str, object]] = {403: {"model": ErrorResponse}}


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
