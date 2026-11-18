import type { components } from "@/lib/api/schema";
import { bookingHref, parseBookingParams } from "@/lib/booking";

export type MyAppointment =
  components["schemas"]["CustomerAppointmentResponse"];
export type MyAppointments =
  components["schemas"]["CustomerAppointmentsResponse"];

/** Resultado das Server Actions de cancelar e remarcar. O sucesso redireciona. */
export type ChangeState = {
  status: "idle" | "error";
  message?: string;
  /** `code` do erro da API, para a tela mostrar o contato no prazo vencido. */
  code?: string;
};

export const MY_APPOINTMENTS_PATH = "/meus-agendamentos";

/** O aviso que a lista mostra depois de uma alteração (`?aviso=`). */
export const NOTICES = {
  cancelado: "Agendamento cancelado.",
  remarcado: "Agendamento remarcado.",
  // RN-14: a alteração foi em cima da hora (`changed_late` da API).
  "cancelado-em-cima":
    "Agendamento cancelado. Obrigado por avisar: assim o barbeiro não fica te esperando.",
  "remarcado-em-cima": "Agendamento remarcado. Obrigado por avisar.",
} as const;

export type Notice = keyof typeof NOTICES;

export function noticeFrom(value: unknown): Notice | undefined {
  return typeof value === "string" && Object.hasOwn(NOTICES, value)
    ? (value as Notice)
    : undefined;
}

export const DEADLINE_CODE = "CHANGE_DEADLINE_PASSED";

export const loadUnavailableMessage =
  "Não foi possível carregar seus agendamentos. Tente novamente em instantes.";

export const changeUnavailableMessage =
  "Não foi possível concluir agora. Tente novamente em instantes.";

export const slotsUnavailableMessage =
  "Não foi possível carregar os horários. Tente novamente em instantes.";

/** Id da URL (`/meus-agendamentos/12/...`); qualquer outra coisa é `null`. */
export function appointmentId(value: string): number | null {
  return /^[1-9]\d{0,9}$/.test(value) ? Number(value) : null;
}

export function cancelHref(id: number): string {
  return `${MY_APPOINTMENTS_PATH}/${id}/cancelar`;
}

/** O `.ics` do agendamento, entregue pelo Route Handler `[id]/calendario`. */
export function calendarHref(id: number): string {
  return `${MY_APPOINTMENTS_PATH}/${id}/calendario`;
}

/**
 * O que o cliente já escolheu na remarcação. Fica na URL
 * (`?barbeiro=&data=&hora=`), como no `/agendar`. O serviço não muda (RN-15).
 */
export type RescheduleSelection = {
  barbeiro?: number;
  /** Data local de São Paulo, `AAAA-MM-DD`. */
  data?: string;
  /** Hora local de São Paulo, `HH:MM`. */
  hora?: string;
};

const ORDER = ["barbeiro", "data", "hora"] as const;

export type RescheduleField = (typeof ORDER)[number];
export type RescheduleStep = RescheduleField | "confirmar";

export const RESCHEDULE_STEPS: {
  step: RescheduleStep;
  label: string;
  title: string;
}[] = [
  { step: "barbeiro", label: "Barbeiro", title: "Escolha o barbeiro" },
  { step: "data", label: "Dia", title: "Escolha o novo dia" },
  { step: "hora", label: "Horário", title: "Escolha o novo horário" },
  { step: "confirmar", label: "Confirmação", title: "Confirme a remarcação" },
];

/** Link para a remarcação com as escolhas dadas, sempre na mesma ordem. */
export function rescheduleHref(
  id: number,
  selection: RescheduleSelection = {},
): string {
  const base = `${MY_APPOINTMENTS_PATH}/${id}/remarcar`;
  const query = bookingHref(selection).split("?")[1];
  return query ? `${base}?${query}` : base;
}

/** A primeira escolha que falta é a etapa atual. */
export function rescheduleStep(selection: RescheduleSelection): RescheduleStep {
  return ORDER.find((field) => selection[field] === undefined) ?? "confirmar";
}

/** Tira a escolha `field` e as que dependem dela: o destino do "Trocar". */
export function withoutRescheduleChoice(
  selection: RescheduleSelection,
  field: RescheduleField,
): RescheduleSelection {
  const kept: RescheduleSelection = { ...selection };
  for (const later of ORDER.slice(ORDER.indexOf(field))) delete kept[later];
  return kept;
}

/**
 * Lê as escolhas da URL com as mesmas validações do `/agendar`: o dia só vale
 * com o barbeiro, e o horário só com o dia.
 */
export function parseRescheduleParams(
  params: Record<string, string | string[] | undefined>,
): RescheduleSelection {
  // O serviço é fixo: um valor qualquer só satisfaz a dependência do parser.
  const { barbeiro, data, hora } = parseBookingParams({
    ...params,
    servico: "1",
  });
  const selection: RescheduleSelection = {};
  if (barbeiro !== undefined) selection.barbeiro = barbeiro;
  if (data !== undefined) selection.data = data;
  if (hora !== undefined) selection.hora = hora;
  return selection;
}
