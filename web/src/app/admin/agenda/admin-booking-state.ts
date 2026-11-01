import type { components } from "@/lib/api/schema";
import {
  bookingHref,
  parseBookingParams,
  positiveInteger,
  type BookingSelection,
} from "@/lib/booking";
import { localDate } from "@/lib/format";
import { AGENDA_PATH, appointmentHref } from "./agenda-state";

export type AdminCustomer = components["schemas"]["CustomerResponse"];
export type AdminCustomerPage = components["schemas"]["CustomerPage"];

/** O agendamento manual da administração (docs/specs/agendamento-admin.md). */
export const NEW_APPOINTMENT_PATH = `${AGENDA_PATH}/novo`;

/** O cliente escolhido: um já cadastrado (o id) ou um novo, cadastrado na hora. */
export type CustomerChoice = number | "novo";

/**
 * O que a administração já escolheu no "Novo agendamento". Fica na URL
 * (`?barbeiro=&servico=&data=&hora=&cliente=`), então o fluxo funciona sem JS
 * e o "voltar" do navegador também.
 */
export type NewAppointmentSelection = BookingSelection & {
  cliente?: CustomerChoice;
};

/** O horário vem antes do cliente: ao telefone, primeiro se acha a vaga. */
const ORDER = ["barbeiro", "servico", "data", "hora", "cliente"] as const;

export type NewAppointmentField = (typeof ORDER)[number];
export type NewAppointmentStep = NewAppointmentField | "confirmar";

export const NEW_APPOINTMENT_STEPS: {
  step: NewAppointmentStep;
  label: string;
  title: string;
}[] = [
  { step: "barbeiro", label: "Barbeiro", title: "Escolha o barbeiro" },
  { step: "servico", label: "Serviço", title: "Escolha o serviço" },
  { step: "data", label: "Dia", title: "Escolha o dia" },
  { step: "hora", label: "Horário", title: "Escolha o horário" },
  { step: "cliente", label: "Cliente", title: "Escolha o cliente" },
  { step: "confirmar", label: "Confirmação", title: "Confirme o agendamento" },
];

type SearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * Lê as escolhas da URL com as validações do `/agendar` (o dia só vale com o
 * barbeiro e o serviço, o horário só com o dia). O cliente só vale com o
 * horário. Se as escolhas existem é a página que confere, com a API.
 */
export function parseNewAppointmentParams(
  params: SearchParams,
): NewAppointmentSelection {
  const selection: NewAppointmentSelection = parseBookingParams(params);
  if (selection.hora === undefined) return selection;
  const cliente = single(params.cliente);
  const choice: CustomerChoice | undefined =
    cliente === "novo" ? "novo" : positiveInteger(cliente);
  if (choice !== undefined) selection.cliente = choice;
  return selection;
}

/** O texto da busca de cliente (`?q=`), sem espaços nas pontas. */
export function parseCustomerQuery(
  value: string | string[] | undefined,
): string {
  return (single(value) ?? "").trim().slice(0, 100);
}

/** Link para o fluxo com as escolhas dadas, sempre na mesma ordem. */
export function newAppointmentHref(
  selection: NewAppointmentSelection = {},
  query?: string,
): string {
  const { cliente, ...booking } = selection;
  const params = new URLSearchParams(bookingHref(booking).split("?")[1] ?? "");
  if (cliente !== undefined) params.set("cliente", String(cliente));
  if (query) params.set("q", query);
  const search = params.toString().replaceAll("%3A", ":");
  return search ? `${NEW_APPOINTMENT_PATH}?${search}` : NEW_APPOINTMENT_PATH;
}

/** A primeira escolha que falta é a etapa atual. */
export function newAppointmentStep(
  selection: NewAppointmentSelection,
): NewAppointmentStep {
  return ORDER.find((field) => selection[field] === undefined) ?? "confirmar";
}

/** Tira a escolha `field` e as que vêm depois dela: o destino do "Trocar". */
export function withoutNewChoice(
  selection: NewAppointmentSelection,
  field: NewAppointmentField,
): NewAppointmentSelection {
  const kept: NewAppointmentSelection = { ...selection };
  for (const later of ORDER.slice(ORDER.indexOf(field))) delete kept[later];
  return kept;
}

/** A posição de uma etapa: "Etapa 2 de 6 · Serviço". */
export function stepProgress<S extends string>(
  steps: { step: S; label: string; title: string }[],
  step: S,
) {
  const index = steps.findIndex((item) => item.step === step);
  const current = steps[index];
  return {
    number: index + 1,
    total: steps.length,
    label: current.label,
    title: current.title,
  };
}

export function adminCancelHref(id: number): string {
  return `${AGENDA_PATH}/${id}/cancelar`;
}

/** A remarcação começa pelo dia, com o barbeiro atual já escolhido. */
export function adminRescheduleHref(
  id: number,
  selection: { barbeiro?: number; data?: string; hora?: string } = {},
): string {
  const base = `${AGENDA_PATH}/${id}/remarcar`;
  const query = bookingHref(selection).split("?")[1];
  return query ? `${base}?${query}` : base;
}

/**
 * O que a administração fica sabendo sobre o e-mail ao cliente (RN-50, RN-52).
 * Quem recebe é decisão da API (só quem tem e-mail cadastrado); aqui o texto só
 * não promete o que não vai acontecer.
 */
const NO_EMAIL = "O cliente não tem e-mail cadastrado e não recebe aviso:";

/** Avisos que o detalhe mostra depois de uma ação (`?aviso=`). */
const NOTICES = {
  criado: "Agendamento criado. O cliente será avisado por e-mail.",
  "criado-sem-email": `Agendamento criado. ${NO_EMAIL} confirme o horário com ele pelo telefone.`,
  remarcado: "Agendamento remarcado. O cliente será avisado por e-mail.",
  "remarcado-sem-email": `Agendamento remarcado. ${NO_EMAIL} avise-o do novo horário pelo telefone.`,
  cancelado: "Agendamento cancelado. O cliente será avisado por e-mail.",
  "cancelado-sem-email": `Agendamento cancelado. ${NO_EMAIL} avise-o pelo telefone.`,
} as const;

export type AdminNotice = keyof typeof NOTICES;

/** A ação feita, para escolher o aviso conforme o cliente tenha e-mail ou não. */
export type AdminAction = "criado" | "remarcado" | "cancelado";

/** `criado-sem-email` etc. quando o cliente não tem e-mail (RN-50). */
export function noticeFor(
  action: AdminAction,
  customerEmail: string | null | undefined,
): AdminNotice {
  return customerEmail ? action : `${action}-sem-email`;
}

/** Só aceita os avisos conhecidos: o texto da URL nunca vai para a tela. */
export function adminNoticeMessage(
  value: string | string[] | undefined,
): string | undefined {
  if (typeof value !== "string" || !Object.hasOwn(NOTICES, value)) {
    return undefined;
  }
  return NOTICES[value as AdminNotice];
}

/** O detalhe do agendamento, na agenda do dia dele, com o aviso da ação. */
export function detailWithNotice(
  id: number,
  startsAt: string,
  notice: AdminNotice,
): string {
  const href = appointmentHref(id, { data: localDate(startsAt), visao: "dia" });
  return `${href}&aviso=${notice}`;
}

/** O que as telas de confirmação dizem sobre o aviso ao cliente (RN-50, RN-52). */
export function customerNoticeText(email: string | null | undefined): string {
  return email
    ? "O cliente será avisado por e-mail."
    : "O cliente não tem e-mail cadastrado e não receberá aviso: fale com ele pelo telefone.";
}

/** Resultado das Server Actions. `values` repõe o que foi digitado. */
export type AdminBookingState = {
  status: "idle" | "error";
  message?: string;
  /** `code` do erro da API, para oferecer "Escolher outro horário". */
  code?: string;
  values?: Record<string, string>;
};

export const SLOT_UNAVAILABLE_CODE = "SLOT_UNAVAILABLE";

export const actionUnavailableMessage =
  "Não foi possível concluir agora. Tente novamente em instantes.";

export const slotsUnavailableMessage =
  "Não foi possível carregar os horários. Tente novamente em instantes.";

export const notActiveMessage = "Este agendamento não está mais ativo.";
