"""CSV do relatório financeiro (RN-43, RN-70), para abrir direto no Excel pt-BR.

Escolhas de formato, todas para o Excel em português do Brasil:

- separador `;` (o Excel pt-BR usa `;` porque a vírgula é o decimal);
- valor com vírgula decimal e sem separador de milhar (`1250,00`), que o Excel
  reconhece como número;
- data `dd/mm/aaaa` e hora `HH:MM` em colunas separadas, no fuso de São Paulo
  (RN-01);
- UTF-8 com BOM (o Excel só reconhece os acentos com ele) e linhas em CRLF.

Uma célula de texto que comece com `=`, `+`, `-`, `@`, tabulação ou retorno
vira texto literal (prefixo `'`): o nome do cliente é digitado por qualquer
pessoa, e o Excel executaria uma fórmula escrita nele.
"""

import csv
import io
from datetime import date
from decimal import Decimal

from app.clock import TIMEZONE
from app.modules.payments.models import PaymentMethod
from app.modules.reports.service import FinancialReport

BOM = "﻿"
DELIMITER = ";"

HEADER = ["Data", "Hora", "Cliente", "Barbeiro", "Serviço", "Pagamento", "Valor (R$)"]

METHOD_LABELS = {
    PaymentMethod.CASH: "Dinheiro",
    PaymentMethod.PIX: "Pix",
    PaymentMethod.DEBIT: "Débito",
    PaymentMethod.CREDIT: "Crédito",
}

_FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def _text(value: str) -> str:
    """Impede que o Excel trate texto digitado como fórmula."""
    return f"'{value}" if value.startswith(_FORMULA_PREFIXES) else value


def _money(value: Decimal) -> str:
    return f"{value:.2f}".replace(".", ",")


def csv_filename(start: date, end: date) -> str:
    return f"relatorio-{start.isoformat()}-a-{end.isoformat()}.csv"


def render_csv(report: FinancialReport) -> bytes:
    """A lista dos concluídos do período, na ordem do relatório."""
    buffer = io.StringIO(newline="")
    writer = csv.writer(buffer, delimiter=DELIMITER, lineterminator="\r\n")
    writer.writerow(HEADER)
    for row in report.completed:
        starts_at = row.appointment.starts_at.astimezone(TIMEZONE)
        writer.writerow(
            [
                starts_at.strftime("%d/%m/%Y"),
                starts_at.strftime("%H:%M"),
                _text(row.customer.name),
                _text(row.barber.name),
                _text(row.service.name),
                METHOD_LABELS[row.payment.method],
                _money(row.payment.amount),
            ]
        )
    return (BOM + buffer.getvalue()).encode("utf-8")
