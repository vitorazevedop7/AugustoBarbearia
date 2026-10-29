import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.export_openapi import main, render_openapi


def test_export_openapi_grava_o_mesmo_contrato_servido(
    tmp_path: Path, client: TestClient
) -> None:
    output = tmp_path / "openapi.json"

    main([str(output)])

    content = output.read_text(encoding="utf-8")
    spec = json.loads(content)
    assert spec == client.get("/openapi.json").json()
    assert "/health" in spec["paths"]
    assert content.endswith("\n")


def test_export_openapi_e_deterministico() -> None:
    assert render_openapi() == render_openapi()


def test_export_openapi_sem_arquivo_escreve_no_stdout(
    capsys: pytest.CaptureFixture[str],
) -> None:
    main([])

    assert capsys.readouterr().out == render_openapi()
