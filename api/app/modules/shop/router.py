"""Rotas da barbearia: leitura pública e alteração pela administração (RN-70)."""

from collections.abc import Sequence
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import require_admin
from app.auth.schemas import CurrentUser
from app.db import get_session
from app.errors import ErrorResponse
from app.modules.shop import service
from app.modules.shop.models import BusinessHours, Shop
from app.modules.shop.schemas import BusinessHoursDay, ShopResponse, ShopUpdate

router = APIRouter(tags=["Barbearia"])

admin_errors: dict[int | str, dict[str, object]] = {
    401: {"model": ErrorResponse},
    403: {"model": ErrorResponse},
}


def _days(rows: Sequence[BusinessHours]) -> list[BusinessHoursDay]:
    return [
        BusinessHoursDay(
            weekday=row.weekday, opens_at=row.opens_at, closes_at=row.closes_at
        )
        for row in rows
    ]


def _shop_response(shop: Shop, hours: Sequence[BusinessHours]) -> ShopResponse:
    return ShopResponse(
        name=shop.name,
        tagline=shop.tagline,
        about=shop.about,
        address=shop.address,
        phone=shop.phone,
        whatsapp=shop.whatsapp,
        instagram=shop.instagram,
        email=shop.email,
        business_hours=_days(hours),
    )


@router.get("/public/shop", response_model=ShopResponse)
def get_public_shop(
    session: Annotated[Session, Depends(get_session)],
) -> ShopResponse:
    return _shop_response(
        service.get_shop(session), service.list_business_hours(session)
    )


@router.put("/admin/shop", response_model=ShopResponse, responses=admin_errors)
def put_shop(
    data: ShopUpdate,
    session: Annotated[Session, Depends(get_session)],
    _admin: Annotated[CurrentUser, Depends(require_admin)],
) -> ShopResponse:
    shop = service.update_shop(session, data)
    return _shop_response(shop, service.list_business_hours(session))


@router.put(
    "/admin/business-hours",
    response_model=list[BusinessHoursDay],
    responses=admin_errors,
)
def put_business_hours(
    days: list[BusinessHoursDay],
    session: Annotated[Session, Depends(get_session)],
    _admin: Annotated[CurrentUser, Depends(require_admin)],
) -> list[BusinessHoursDay]:
    return _days(service.update_business_hours(session, days))
