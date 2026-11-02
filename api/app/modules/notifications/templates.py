"""Textos dos e-mails ao cliente, em HTML simples e em texto (RN-53)."""

from dataclasses import dataclass
from datetime import datetime
from html import escape

from app.clock import TIMEZONE
from app.modules.notifications.models import NotificationKind

WEEKDAYS = (
    "segunda-feira",
    "terça-feira",
    "quarta-feira",
    "quinta-feira",
    "sexta-feira",
    "sábado",
    "domingo",
)
MONTHS = (
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
)

# Tokens da identidade visual (docs/design/identidade-visual.md). Clientes de
# e-mail não leem variáveis CSS, então os valores entram inline.
INK = "#111111"
INK_MUTED = "#5C5C5C"
PAPER = "#FAF7F2"
SURFACE = "#FFFFFF"
BRAND = "#C41E3A"

# RN-14: o mesmo prazo das telas do cliente (`CHANGE_NOTICE` e `can_change_at`,
# em `appointments/service.py`); aqui só o texto.
CHANGE_NOTICE = "Você pode remarcar ou cancelar pelo site até 2 horas antes do horário."


@dataclass(frozen=True, slots=True)
class ShopContact:
    """Os dados da barbearia que entram no e-mail; os vazios não aparecem."""

    name: str
    address: str | None
    phone: str | None
    whatsapp: str | None
    instagram: str | None
    email: str | None


@dataclass(frozen=True, slots=True)
class AppointmentDetails:
    customer_name: str
    service_name: str
    barber_name: str
    starts_at: datetime
    shop: ShopContact
    my_appointments_url: str
    # RN-52: cancelado pela barbearia (`canceled_by = ADMIN`, RN-33). Só muda o
    # texto do `CANCELED`: o cliente precisa saber que não foi ele.
    canceled_by_shop: bool = False
    # RN-14 e RN-53: o aviso "remarque ou cancele pelo site até 2 horas antes" só
    # vale enquanto o prazo vale. Depois, o e-mail manda falar com a barbearia.
    can_change: bool = True


@dataclass(frozen=True, slots=True)
class RenderedEmail:
    subject: str
    html: str
    text: str


@dataclass(frozen=True, slots=True)
class _Copy:
    title: str
    intro: str
    outro: str


def format_phone(digits: str) -> str:
    """Só dígitos (DDD + número) → "(75) 99999-0000", como `formatPhone` do web."""
    if len(digits) in (10, 11) and digits.isdigit():
        return f"({digits[:2]}) {digits[2:-4]}-{digits[-4:]}"
    return digits


def format_time(moment: datetime) -> str:
    return f"{moment:%H}h{moment:%M}"


def long_date(starts_at: datetime) -> str:
    """RN-01: "terça-feira, 3 de novembro de 2026, às 10h00", em São Paulo."""
    local = starts_at.astimezone(TIMEZONE)
    return (
        f"{WEEKDAYS[local.weekday()]}, {local.day} de {MONTHS[local.month - 1]}"
        f" de {local.year}, às {format_time(local)}"
    )


def short_date(starts_at: datetime) -> str:
    """RN-01: "terça-feira, 3/11, às 10h00", em São Paulo."""
    local = starts_at.astimezone(TIMEZONE)
    return (
        f"{WEEKDAYS[local.weekday()]}, {local.day}/{local.month},"
        f" às {format_time(local)}"
    )


def _change_outro(details: AppointmentDetails) -> str:
    """RN-14 e RN-53: o aviso do prazo enquanto ele vale; depois dele, a
    orientação de falar com a barbearia (os contatos já vêm no fim do e-mail)."""
    if details.can_change:
        return CHANGE_NOTICE
    if _contacts(details.shop):
        return (
            "O prazo para remarcar ou cancelar pelo site já passou. Para mudar "
            "o horário, fale com a barbearia pelos contatos abaixo."
        )
    return (
        "O prazo para remarcar ou cancelar pelo site já passou. Para mudar o "
        "horário, fale com a barbearia."
    )


def _copy(
    kind: NotificationKind,
    shop_name: str,
    *,
    canceled_by_shop: bool = False,
    can_change: bool = True,
    change_outro: str = CHANGE_NOTICE,
    has_contacts: bool = True,
) -> _Copy:
    match kind:
        case NotificationKind.CONFIRMATION:
            return _Copy(
                title="Agendamento confirmado",
                intro=f"Seu horário na {shop_name} está confirmado.",
                outro=change_outro,
            )
        case NotificationKind.RESCHEDULED:
            return _Copy(
                title="Agendamento remarcado",
                intro=(
                    f"Seu agendamento na {shop_name} foi remarcado. "
                    "Este é o novo horário:"
                ),
                outro=change_outro,
            )
        case NotificationKind.CANCELED if canceled_by_shop:
            # RN-52 e RN-53: quem cancelou e como falar com a barbearia (os
            # contatos preenchidos entram logo abaixo; sem eles, o texto não
            # aponta para uma lista que não existe).
            return _Copy(
                title="Agendamento cancelado",
                intro=(
                    f"A {shop_name} cancelou o seu agendamento. "
                    "O horário não está mais reservado:"
                ),
                outro=(
                    "Para combinar um novo horário, fale com a barbearia "
                    + ("pelos contatos abaixo " if has_contacts else "")
                    + "ou agende pelo site."
                ),
            )
        case NotificationKind.CANCELED:
            return _Copy(
                title="Agendamento cancelado",
                intro=f"Seu agendamento na {shop_name} foi cancelado.",
                outro="Quer marcar outro horário? É só agendar pelo site.",
            )
        case NotificationKind.REMINDER:
            return _Copy(
                title="Lembrete do seu horário",
                intro=f"Passando para lembrar do seu horário na {shop_name}.",
                outro=(
                    "Não vai conseguir vir? "
                    + (
                        "Remarque ou cancele pelo site até 2 horas antes do horário."
                        if can_change
                        else change_outro
                    )
                ),
            )


def _subject(kind: NotificationKind, starts_at: datetime) -> str:
    when = short_date(starts_at)
    if kind == NotificationKind.REMINDER:
        return f"Lembrete: seu horário é {when}"
    return f"{_copy(kind, '').title}: {when}"


def _contacts(shop: ShopContact) -> list[tuple[str, str, str]]:
    """(rótulo, texto, link) de cada contato preenchido."""
    contacts: list[tuple[str, str, str]] = []
    if shop.whatsapp:
        contacts.append(
            (
                "WhatsApp",
                format_phone(shop.whatsapp),
                f"https://wa.me/55{shop.whatsapp}",
            )
        )
    if shop.phone:
        contacts.append(("Telefone", format_phone(shop.phone), f"tel:+55{shop.phone}"))
    if shop.instagram:
        contacts.append(
            (
                "Instagram",
                f"@{shop.instagram}",
                f"https://instagram.com/{shop.instagram}",
            )
        )
    if shop.email:
        contacts.append(("E-mail", shop.email, f"mailto:{shop.email}"))
    return contacts


def _rows(details: AppointmentDetails) -> list[tuple[str, str]]:
    rows = [
        ("Serviço", details.service_name),
        ("Barbeiro", details.barber_name),
        ("Quando", long_date(details.starts_at)),
    ]
    if details.shop.address:
        rows.append(("Onde", details.shop.address))
    return rows


def _text(copy: _Copy, details: AppointmentDetails) -> str:
    lines = [f"Olá, {details.customer_name}!", "", copy.intro, ""]
    lines += [f"{label}: {value}" for label, value in _rows(details)]
    lines += [
        "",
        copy.outro,
        "",
        f"Meus agendamentos: {details.my_appointments_url}",
    ]
    contacts = _contacts(details.shop)
    if contacts:
        lines += ["", "Fale com a barbearia:"]
        lines += [f"{label}: {value}" for label, value, _link in contacts]
    lines += ["", details.shop.name]
    return "\n".join(lines) + "\n"


def _html(copy: _Copy, details: AppointmentDetails) -> str:
    rows = "".join(
        f'<tr><td style="padding:4px 16px 4px 0;color:{INK_MUTED}">{escape(label)}</td>'
        f'<td style="padding:4px 0"><strong>{escape(value)}</strong></td></tr>'
        for label, value in _rows(details)
    )
    contacts = _contacts(details.shop)
    contact_html = ""
    if contacts:
        items = "".join(
            f'<li>{escape(label)}: <a href="{escape(link)}">{escape(value)}</a></li>'
            for label, value, link in contacts
        )
        contact_html = (
            '<p style="margin:24px 0 4px">Fale com a barbearia:</p>'
            f'<ul style="margin:0;padding-left:20px">{items}</ul>'
        )
    url = escape(details.my_appointments_url)
    return (
        '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">'
        f"<title>{escape(copy.title)}</title></head>"
        f'<body style="margin:0;padding:24px;background:{PAPER};'
        f'font-family:Arial,Helvetica,sans-serif;color:{INK};line-height:1.5">'
        f'<div style="max-width:560px;margin:0 auto;background:{SURFACE};padding:24px">'
        f'<h1 style="font-size:22px;margin:0 0 16px">{escape(copy.title)}</h1>'
        f"<p>Olá, {escape(details.customer_name)}!</p>"
        f"<p>{escape(copy.intro)}</p>"
        f'<table role="presentation" style="border-collapse:collapse">{rows}</table>'
        f"<p>{escape(copy.outro)}</p>"
        f'<p><a href="{url}" style="color:{BRAND};font-weight:bold">'
        "Meus agendamentos</a></p>"
        f"{contact_html}"
        f'<p style="margin-top:24px;color:{INK_MUTED}">{escape(details.shop.name)}</p>'
        "</div></body></html>"
    )


def render(kind: NotificationKind, details: AppointmentDetails) -> RenderedEmail:
    """RN-53: serviço, barbeiro, data e hora, endereço, link para "Meus
    agendamentos" e contato da barbearia, em todo e-mail."""
    copy = _copy(
        kind,
        details.shop.name,
        canceled_by_shop=details.canceled_by_shop,
        can_change=details.can_change,
        change_outro=_change_outro(details),
        has_contacts=bool(_contacts(details.shop)),
    )
    return RenderedEmail(
        subject=_subject(kind, details.starts_at),
        html=_html(copy, details),
        text=_text(copy, details),
    )
