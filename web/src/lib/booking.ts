/** Onde começa o agendamento pelo cliente (docs/specs/agendamento-cliente.md). */
export const BOOKING_PATH = "/agendar";

/**
 * O que o cliente já escolheu no fluxo. Fica na URL
 * (`?barbeiro=&servico=&data=&hora=`), então voltar e avançar do navegador
 * funcionam e o fluxo não depende de JavaScript.
 */
export type BookingSelection = {
  barbeiro?: number;
  servico?: number;
  /** Data local de São Paulo, `AAAA-MM-DD`. */
  data?: string;
  /** Hora local de São Paulo, `HH:MM`. */
  hora?: string;
};

/** A ordem das escolhas (D11): barbeiro → serviço → dia → horário. */
const ORDER = ["barbeiro", "servico", "data", "hora"] as const;

export type BookingField = (typeof ORDER)[number];
export type BookingStep = BookingField | "confirmar";

export const BOOKING_STEPS: { step: BookingStep; label: string }[] = [
  { step: "barbeiro", label: "Barbeiro" },
  { step: "servico", label: "Serviço" },
  { step: "data", label: "Dia" },
  { step: "hora", label: "Horário" },
  { step: "confirmar", label: "Confirmação" },
];

/** Link para o fluxo com as escolhas dadas, sempre na mesma ordem. */
export function bookingHref(selection: BookingSelection = {}): string {
  const params = new URLSearchParams();
  for (const field of ORDER) {
    const value = selection[field];
    if (value !== undefined) params.set(field, String(value));
  }
  // Os dois-pontos da hora são válidos na query e ficam legíveis na URL.
  const query = params.toString().replaceAll("%3A", ":");
  return query ? `${BOOKING_PATH}?${query}` : BOOKING_PATH;
}

/** A primeira escolha que falta é a etapa atual. */
export function bookingStep(selection: BookingSelection): BookingStep {
  return ORDER.find((field) => selection[field] === undefined) ?? "confirmar";
}

/**
 * Tira a escolha `field` e as que vêm depois dela na ordem, que dependem dela.
 * É o destino do "Trocar" de cada escolha.
 */
export function withoutChoice(
  selection: BookingSelection,
  field: BookingField,
): BookingSelection {
  const kept: BookingSelection = { ...selection };
  for (const later of ORDER.slice(ORDER.indexOf(field))) delete kept[later];
  return kept;
}

type SearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function positiveInteger(value: string | undefined): number | undefined {
  if (!value || !/^[1-9]\d{0,9}$/.test(value)) return undefined;
  return Number(value);
}

export function calendarDate(value: string | undefined): string | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T00:00:00Z`);
  // Mês ou dia fora do intervalo (2026-13-01) dá Invalid Date, e o toISOString lançaria.
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().startsWith(value) ? value : undefined;
}

function clockTime(value: string | undefined): string | undefined {
  return value && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : undefined;
}

/**
 * Lê as escolhas da URL. Valor malformado é ignorado, e o dia e o horário só
 * valem com as escolhas anteriores (o horário depende do dia, que depende do
 * barbeiro e do serviço). Se as escolhas existem na vitrine é a página que
 * confere, com os dados da API.
 */
export function parseBookingParams(params: SearchParams): BookingSelection {
  const selection: BookingSelection = {
    barbeiro: positiveInteger(single(params.barbeiro)),
    servico: positiveInteger(single(params.servico)),
  };
  if (selection.barbeiro === undefined || selection.servico === undefined) {
    return clean(selection);
  }
  selection.data = calendarDate(single(params.data));
  if (selection.data !== undefined)
    selection.hora = clockTime(single(params.hora));
  return clean(selection);
}

function clean(selection: BookingSelection): BookingSelection {
  return Object.fromEntries(
    Object.entries(selection).filter(([, value]) => value !== undefined),
  );
}
