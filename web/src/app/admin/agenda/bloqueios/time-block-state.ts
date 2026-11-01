import type { components } from "@/lib/api/schema";
import { calendarDate, positiveInteger } from "@/lib/booking";
import { formatLongDate, formatTime, localDate } from "@/lib/format";
import {
  AGENDA_PATH,
  agendaHref,
  parseAgendaParams,
  type AgendaBarber,
  type AgendaState,
} from "../agenda-state";

export type TimeBlock = components["schemas"]["TimeBlockResponse"];
export type TimeBlockCreate = components["schemas"]["TimeBlockCreate"];

export const TIME_BLOCKS_PATH = `${AGENDA_PATH}/bloqueios`;

/** O formulário volta para a agenda de onde veio; estes campos guardam ela. */
export const BACK_FIELDS = {
  visao: "agenda_visao",
  barbeiro: "agenda_barbeiro",
  data: "agenda_data",
} as const;

function query(state: AgendaState): string {
  return agendaHref(state).slice(AGENDA_PATH.length);
}

/** "Bloquear horário", guardando a agenda (data, visão e barbeiro). */
export function newTimeBlockHref(state: AgendaState): string {
  return `${TIME_BLOCKS_PATH}/novo${query(state)}`;
}

/** A confirmação de "Remover", guardando a agenda. */
export function removeTimeBlockHref(id: number, state: AgendaState): string {
  return `${TIME_BLOCKS_PATH}/${id}/remover${query(state)}`;
}

/** Id da URL (`/admin/agenda/bloqueios/12/remover`); outra coisa é `null`. */
export function timeBlockId(value: string): number | null {
  return positiveInteger(value) ?? null;
}

/** Avisos que a agenda mostra ao voltar de um bloqueio (`?aviso=`). */
const NOTICES = {
  bloqueado: "Horário bloqueado.",
  "bloqueio-removido": "Bloqueio removido.",
} as const;

export type TimeBlockNotice = keyof typeof NOTICES;

/** Só aceita os avisos conhecidos: o texto da URL nunca vai para a tela. */
export function timeBlockNotice(
  value: string | string[] | undefined,
): string | undefined {
  if (typeof value !== "string" || !Object.hasOwn(NOTICES, value)) {
    return undefined;
  }
  return NOTICES[value as TimeBlockNotice];
}

/** A agenda com o aviso, para onde as Server Actions voltam. */
export function agendaWithNotice(
  state: AgendaState,
  notice: TimeBlockNotice,
): string {
  return `${agendaHref(state)}&aviso=${notice}`;
}

/** "12:00–13:00", ou "Dia inteiro" para a folga (RN-03). Quem decide é a API. */
export function timeBlockTime(block: TimeBlock): string {
  return block.all_day
    ? "Dia inteiro"
    : `${formatTime(block.starts_at)}–${formatTime(block.ends_at)}`;
}

/** "Edvaldo, terça-feira, 3 de novembro de 2026, 12:00–13:00": nome acessível. */
export function timeBlockSummary(block: TimeBlock): string {
  return `${block.barber.name}, ${formatLongDate(localDate(block.starts_at))}, ${timeBlockTime(block)}`;
}

/** Os bloqueios que começam no dia (RN-01), na ordem da API. */
export function timeBlocksOn(blocks: TimeBlock[], date: string): TimeBlock[] {
  return blocks.filter((block) => localDate(block.starts_at) === date);
}

/**
 * As colunas da visão do dia: os barbeiros da agenda e também quem só tem
 * bloqueio no dia (um barbeiro inativado depois de bloquear não aparece na
 * agenda, mas o bloqueio dele continua valendo). Por nome, como a API.
 */
export function withBlockBarbers(
  barbers: AgendaBarber[],
  blocks: TimeBlock[],
): AgendaBarber[] {
  const found = new Map(barbers.map((barber) => [barber.id, barber]));
  for (const { barber } of blocks) {
    if (!found.has(barber.id)) found.set(barber.id, barber);
  }
  return [...found.values()].sort(
    (a, b) => a.name.localeCompare(b.name, "pt-BR") || a.id - b.id,
  );
}

function text(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * O pedido para a API. "Dia inteiro" vai explícito (`all_day`), sem os
 * horários: a API faz a folga da meia-noite à meia-noite (RN-03). Sem ele,
 * horário em branco vai como `null`, e a API recusa com a mensagem certa, em
 * vez de virar folga sem ninguém ter pedido.
 */
export function parseTimeBlockForm(formData: FormData): TimeBlockCreate {
  const allDay = formData.get("all_day") !== null;
  const reason = text(formData, "reason");
  return {
    barber_id: Number(text(formData, "barber_id")),
    date: text(formData, "date"),
    all_day: allDay,
    start_time: allDay ? null : text(formData, "start_time") || null,
    end_time: allDay ? null : text(formData, "end_time") || null,
    reason: reason || null,
  };
}

/**
 * A agenda de onde o formulário veio. Depois de criar, ela abre no dia do
 * bloqueio, para mostrá-lo; valores inválidos viram o padrão da agenda.
 */
export function backState(formData: FormData, today: string): AgendaState {
  const state = parseAgendaParams(
    {
      data: text(formData, BACK_FIELDS.data),
      visao: text(formData, BACK_FIELDS.visao),
      barbeiro: text(formData, BACK_FIELDS.barbeiro),
    },
    today,
  );
  const blockDate = calendarDate(text(formData, "date"));
  return blockDate ? { ...state, data: blockDate } : state;
}

/** Os campos ocultos que guardam a agenda num formulário. */
export function backFields(state: AgendaState): Record<string, string> {
  const fields: Record<string, string> = {
    [BACK_FIELDS.data]: state.data,
    [BACK_FIELDS.visao]: state.visao,
  };
  if (state.barbeiro !== undefined) {
    fields[BACK_FIELDS.barbeiro] = String(state.barbeiro);
  }
  return fields;
}

export const loadTimeBlocksMessage = "Não foi possível carregar os bloqueios.";
export const timeBlockNotFoundMessage = "Bloqueio não encontrado.";
