"""Exporta o contrato OpenAPI da API para o `pnpm gen:api` e o CI (ADR 0008)."""

import argparse
import json
import sys
from pathlib import Path

from app.main import app


def render_openapi() -> str:
    """Gera o OpenAPI sem subir servidor nem abrir conexão com o banco."""
    spec = app.openapi()
    return json.dumps(spec, ensure_ascii=False, indent=2) + "\n"


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        description="Exporta o contrato OpenAPI da API em JSON.",
    )
    parser.add_argument(
        "arquivo",
        nargs="?",
        type=Path,
        help="Caminho do arquivo de saída. Sem ele, o JSON vai para a saída padrão.",
    )
    args = parser.parse_args(argv)
    output: Path | None = args.arquivo
    content = render_openapi()
    if output is None:
        sys.stdout.write(content)
    else:
        output.write_text(content, encoding="utf-8")


if __name__ == "__main__":
    main()
