from pytest import MonkeyPatch

from app.config import Settings, get_settings


def test_settings_read_environment(monkeypatch: MonkeyPatch) -> None:
    monkeypatch.setenv("APP_NAME", "API de teste")

    assert Settings().app_name == "API de teste"


def test_settings_cache_can_be_reset(monkeypatch: MonkeyPatch) -> None:
    get_settings.cache_clear()
    try:
        monkeypatch.setenv("APP_NAME", "Primeira configuração")
        first = get_settings()
        monkeypatch.setenv("APP_NAME", "Nova configuração")
        assert get_settings() is first
        get_settings.cache_clear()
        assert get_settings().app_name == "Nova configuração"
    finally:
        get_settings.cache_clear()


def test_database_url_is_required(monkeypatch: MonkeyPatch) -> None:
    import pytest
    from pydantic import ValidationError

    monkeypatch.setenv("DATABASE_URL", "")
    with pytest.raises(ValidationError):
        Settings()


def test_web_base_url_blank_uses_default(monkeypatch: MonkeyPatch) -> None:
    monkeypatch.setenv("WEB_BASE_URL", " ")

    assert Settings().web_base_url == "http://localhost:3000"
