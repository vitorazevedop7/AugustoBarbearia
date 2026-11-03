import type { components } from "@/lib/api/schema";
import { calendarDate, positiveInteger } from "@/lib/booking";
import { localDate, shortDateParts } from "@/lib/format";

export type Agenda = components["schemas"]["AgendaResponse"];
export type AgendaAppointment =
  components["schemas"]["AdminAppointmentResponse"];
export type AgendaBarber = components["schemas"]["AgendaBarber"];
export type AgendaDay = components["schemas"]["AgendaDay"];

export const AGENDA_PATH = "/admin/agenda";

export type AgendaView = "dia" | "semana";

/**
 * O que a agenda mostra. Fica na URL (`?data=&visao=&barbeiro=`), então os
 * links e o "voltar" do navegador funcionam sem JS.
 */
export type AgendaState = {
  /** Data local de São Paulo, `AAAA-MM-DD`. */
  data: string;
  visao: AgendaView;
  /** Sem ele, todos os barbeiros. */
  barbeiro?: number;
};

type SearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/** O dia de hoje em São Paulo (RN-01), `AAAA-MM-DD`. */
export function todayInSaoPaulo(now: Date = new Date()): string {
  return localDate(now.toISOString());
}

/** Lê o estado da URL; valor inválido vira o padrão (hoje, dia, todos). */
export function parseAgendaParams(
  params: SearchParams,
  today: string,
): AgendaState {
  const state: AgendaState = {
    data: calendarDate(single(params.data)) ?? today,
    visao: single(params.visao) === "semana" ? "semana" : "dia",
  };
  const barbeiro = positiveInteger(single(params.barbeiro));
  if (barbeiro !== undefined) state.barbeiro = barbeiro;
  return state;
}

/** Soma dias a uma data do calendário, sem passar pelo fuso de quem calcula. */
export function addDays(date: string, days: number): string {
  const moment = new Date(`${date}T00:00:00Z`);
  moment.setUTCDate(moment.getUTCDate() + days);
  return moment.toISOString().slice(0, 10);
}

/** A segunda-feira da semana da data: a semana vai de segunda a domingo. */
export function weekStart(date: string): string {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  return addDays(date, -((weekday + 6) % 7));
}

/** O período que a página pede à API: o dia, ou a semana inteira. */
export function agendaPeriod(state: AgendaState): {
  start: string;
  end: string;
} {
  if (state.visao === "dia") return { start: state.data, end: state.data };
  const start = weekStart(state.data);
  return { start, end: addDays(start, 6) };
}

function query(state: AgendaState): string {
  const params = new URLSearchParams({ data: state.data });
  if (state.visao === "semana") params.set("visao", "semana");
  if (state.barbeiro !== undefined)
    params.set("barbeiro", String(state.barbeiro));
  return params.toString();
}

export function agendaHref(state: AgendaState): string {
  return `${AGENDA_PATH}?${query(state)}`;
}

/** Anterior (-1) ou próximo (1): um dia na visão do dia, uma semana na da semana. */
export function shiftAgenda(
  state: AgendaState,
  direction: -1 | 1,
): AgendaState {
  const step = state.visao === "semana" ? 7 : 1;
  return { ...state, data: addDays(state.data, direction * step) };
}

/** O detalhe guarda a agenda de onde veio, para o "Voltar" voltar para ela. */
export function appointmentHref(id: number, state: AgendaState): string {
  return `${AGENDA_PATH}/${id}?${query(state)}`;
}

/** Id da URL (`/admin/agenda/12`); qualquer outra coisa é `null`. */
export function appointmentId(value: string): number | null {
  return positiveInteger(value) ?? null;
}

/** RN-02: "10:00 às 19:00", ou "Fechado". Quem decide o horário é a API. */
export function openingLabel(day: AgendaDay): string {
  return day.opens_at && day.closes_at
    ? `${day.opens_at.slice(0, 5)} às ${day.closes_at.slice(0, 5)}`
    : "Fechado";
}

/** "Semana de 2 a 8 de nov", ou "Semana de 30 de nov a 6 de dez". */
export function formatWeekRange(start: string, end: string): string {
  const first = shortDateParts(start);
  const last = shortDateParts(end);
  const from =
    first.month === last.month ? first.day : `${first.day} de ${first.month}`;
  return `Semana de ${from} a ${last.day} de ${last.month}`;
}

/** Os agendamentos que começam no dia (RN-01), na ordem da API. */
export function appointmentsOn(
  appointments: AgendaAppointment[],
  date: string,
): AgendaAppointment[] {
  return appointments.filter((item) => localDate(item.starts_at) === date);
}

export const loadUnavailableMessage =
  "Não foi possível carregar a agenda. Tente novamente em instantes.";

export const SOURCE_LABELS: Record<AgendaAppointment["source"], string> = {
  ONLINE: "Online",
  ADMIN: "Administração",
};

/**
 * Quanto antes do horário o cliente cancelou, para o detalhe da agenda: "30
 * min", "1 h" ou "1 h 20 min". Quem decide se foi em cima da hora é a API
 * (`canceled_late`, RN-14 e RN-33); aqui só a conta para o texto.
 */
export function canceledAhead(startsAt: string, canceledAt: string): string {
  const minutes = Math.floor(
    (Date.parse(startsAt) - Date.parse(canceledAt)) / 60_000,
  );
  if (minutes < 1) return "menos de 1 min";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${minutes} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
