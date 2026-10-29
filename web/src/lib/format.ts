/** Telefone guardado só com dígitos (DDD + número) → "(75) 99999-0000". */
export function formatPhone(digits: string): string {
  const match = /^(\d{2})(\d{4,5})(\d{4})$/.exec(digits);
  return match ? `(${match[1]}) ${match[2]}-${match[3]}` : digits;
}

/** Hora da API ("10:00:00") no formato do campo `type="time"` ("10:00"). */
export function toTimeInput(value: string | null | undefined): string {
  return value ? value.slice(0, 5) : "";
}

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/**
 * Preço da API, uma string decimal ("25.00"), em reais ("R$ 25,00").
 * O `Intl` formata a string sem convertê-la em `number`: nada passa por float.
 */
export function formatPrice(value: string): string {
  return currency.format(value as Intl.StringNumericLiteral);
}

/** Preço da API ("1234.50") no formato em que a pessoa digita ("1234,50"). */
export function toPriceInput(value: string | null | undefined): string {
  return value ? value.replace(".", ",") : "";
}

/** Duração em minutos: "50 min", "1h" ou "1h 30min". */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${minutes} min`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}min`;
}

/** Fuso de todas as datas e horas do negócio (RN-01). */
export const TIME_ZONE = "America/Sao_Paulo";

/**
 * Uma data da API sem hora ("2026-11-03") é um dia do calendário. Ela é lida
 * e formatada em UTC, para o fuso de quem formata não mudar o dia.
 */
function calendarDay(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const shortDate = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** As partes da data em lista: { weekday: "Ter", day: "3", month: "nov" }. */
export function shortDateParts(date: string) {
  const parts = shortDate.formatToParts(calendarDay(date));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    (parts.find((item) => item.type === type)?.value ?? "").replace(".", "");
  return {
    weekday: capitalize(part("weekday")),
    day: part("day"),
    month: part("month"),
  };
}

/** Data em lista: "Ter, 3 de nov". */
export function formatShortDate(date: string): string {
  const { weekday, day, month } = shortDateParts(date);
  return `${weekday}, ${day} de ${month}`;
}

const longDate = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "full",
  timeZone: "UTC",
});

/** Data completa: "terça-feira, 3 de novembro de 2026". */
export function formatLongDate(date: string): string {
  return longDate.format(calendarDay(date));
}

const monthYear = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** Mês de uma data: "Novembro de 2026". */
export function formatMonth(date: string): string {
  return capitalize(monthYear.format(calendarDay(date)));
}

const clock = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

/** Hora de um instante da API, em São Paulo: "14:30". */
export function formatTime(instant: string): string {
  return clock.format(new Date(instant));
}

const isoDay = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE });

/** O dia de São Paulo de um instante da API, como `AAAA-MM-DD`. */
export function localDate(instant: string): string {
  return isoDay.format(new Date(instant));
}

const conjunction = new Intl.ListFormat("pt-BR", {
  style: "long",
  type: "conjunction",
});

/** Lista de nomes em português: "Edvaldo, Lauro e Manoel". */
export function formatList(items: string[]): string {
  return conjunction.format(items);
}
