"""Criação da aplicação e registro dos routers."""

from fastapi import FastAPI

from app.auth.router import router as auth_router
from app.config import get_settings
from app.errors import ErrorResponse, register_error_handlers
from app.health import router as health_router
from app.modules.customers.router import router as customers_router
from app.modules.shop.router import router as shop_router


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
    return application


app = create_app()
