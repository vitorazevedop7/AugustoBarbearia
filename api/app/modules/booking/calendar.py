"""Arquivo de calendário (`.ics`, RFC 5545) de um agendamento (RN-16).

Um `VEVENT` só, com os instantes em UTC (`...Z`): vale em qualquer calendário
sem precisar de `VTIMEZONE`, e o aplicativo mostra o horário no fuso do
aparelho. O `UID` é fixo por agendamento, então importar o arquivo de novo
depois de uma remarcação atualiza o evento em vez de duplicá-lo.
"""

from datetime import UTC, datetime

from app.modules.appointments.models import Appointment
from app.modules.barbers.models import Barber
from app.modules.catalog.models import Service

BRAND = "Augusto Barbearia"
PRODID = "-//Augusto Barbearia//Agendamento//PT-BR"
UID_DOMAIN = "augustobarbearia"
# RFC 5545, 3.1: nenhuma linha passa de 75 octetos, sem contar o CRLF.
MAX_LINE_OCTETS = 75


def escape_text(value: str) -> str:
    """RFC 5545, 3.3.11: escapa `\\`, `;`, `,` e a quebra de linha."""
    return (
        value.replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\r\n", "\\n")
        .replace("\r", "\\n")
        .replace("\n", "\\n")
    )


def fold_line(line: str) -> str:
    """RFC 5545, 3.1: quebra a linha em até 75 octetos UTF-8, sem partir um
    caractere ao meio. As continuações começam com um espaço."""
    pieces: list[str] = []
    current = ""
    size = 0
    for char in line:
        width = len(char.encode("utf-8"))
        if size + width > MAX_LINE_OCTETS:
            pieces.append(current)
            # A continuação leva um espaço, que também conta nos 75 octetos.
            current, size = " ", 1
        current += char
        size += width
    pieces.append(current)
    return "\r\n".join(pieces)


def _utc(moment: datetime) -> str:
    return moment.astimezone(UTC).strftime("%Y%m%dT%H%M%SZ")


def calendar_filename(appointment_id: int) -> str:
    return f"agendamento-{appointment_id}.ics"


def render_ics(
    appointment: Appointment,
    *,
    barber: Barber,
    service: Service,
    address: str | None,
) -> bytes:
    """O evento do agendamento. `LOCATION` só entra se a barbearia tem endereço."""
    summary = f"{service.name} com {barber.name} — {BRAND}"
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        f"PRODID:{PRODID}",
        "CALSCALE:GREGORIAN",
        "BEGIN:VEVENT",
        f"UID:agendamento-{appointment.id}@{UID_DOMAIN}",
        f"DTSTAMP:{_utc(appointment.updated_at)}",
        f"DTSTART:{_utc(appointment.starts_at)}",
        f"DTEND:{_utc(appointment.ends_at)}",
        f"SUMMARY:{escape_text(summary)}",
    ]
    if address:
        lines.append(f"LOCATION:{escape_text(f'{BRAND}, {address}')}")
    lines += ["STATUS:CONFIRMED", "TRANSP:OPAQUE", "END:VEVENT", "END:VCALENDAR"]
    return ("\r\n".join(fold_line(line) for line in lines) + "\r\n").encode("utf-8")
