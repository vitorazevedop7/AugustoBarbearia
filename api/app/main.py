"""Criação da aplicação e registro dos routers."""

from fastapi import FastAPI

from app.auth.router import router as auth_router
from app.config import get_settings
from app.errors import ErrorResponse, register_error_handlers
from app.health import router as health_router
from app.modules.agenda.router import router as agenda_router
from app.modules.availability.router import router as availability_router
from app.modules.barbers.router import public_router as public_barbers_router
from app.modules.barbers.router import router as barbers_router
from app.modules.booking.router import router as booking_router
from app.modules.catalog.router import public_router as public_catalog_router
from app.modules.catalog.router import router as catalog_router
from app.modules.customers.router import admin_router as admin_customers_router
from app.modules.customers.router import router as customers_router
from app.modules.payments.router import router as payments_router
from app.modules.shop.router import router as shop_router
from app.modules.time_blocks.router import router as time_blocks_router


def create_app() -> FastAPI:
    application = FastAPI(
        title=get_settings().app_name,
        version="0.1.0",
        responses={"default": {"model": ErrorResponse}, 422: {"model": ErrorResponse}},
    )
    register_error_handlers(application)
    application.include_router(health_router)
    application.include_router(auth_router)
    application.include_router(shop_router)
    application.include_router(customers_router)
    application.include_router(admin_customers_router)
    application.include_router(barbers_router)
    application.include_router(catalog_router)
    application.include_router(public_barbers_router)
    application.include_router(public_catalog_router)
    application.include_router(availability_router)
    application.include_router(booking_router)
    application.include_router(agenda_router)
    application.include_router(payments_router)
    application.include_router(time_blocks_router)
    return application


app = create_app()
