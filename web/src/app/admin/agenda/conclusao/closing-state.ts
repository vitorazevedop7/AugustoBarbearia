import type { components } from "@/lib/api/schema";
import { formatLongDate, formatTime, localDate } from "@/lib/format";
import { appointmentHref, type AgendaState } from "../agenda-state";

export type PaymentMethod = components["schemas"]["PaymentMethod"];
export type AppointmentPayment = components["schemas"]["PaymentResponse"];

/** As formas da RN-40, na ordem em que aparecem na tela. */
export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  "CASH",
  "PIX",
  "DEBIT",
  "CREDIT",
];

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Dinheiro",
  PIX: "Pix",
  DEBIT: "Débito",
  CREDIT: "Crédito",
};

/** Avisos que o detalhe mostra ao voltar de uma ação (`?aviso=`). */
const NOTICES = {
  concluido: "Atendimento concluído.",
  faltou: "Falta registrada.",
  corrigido: "Pagamento corrigido.",
} as const;

export type Notice = keyof typeof NOTICES;

/** Só aceita os avisos conhecidos: o texto da URL nunca vai para a tela. */
export function noticeMessage(
  value: string | string[] | undefined,
): string | undefined {
  if (typeof value !== "string" || !Object.hasOwn(NOTICES, value)) {
    return undefined;
  }
  return NOTICES[value as Notice];
}

/** O detalhe com o aviso, guardando a agenda de onde veio. */
export function noticeHref(
  id: number,
  agenda: AgendaState,
  notice: Notice,
): string {
  return `${appointmentHref(id, agenda)}&aviso=${notice}`;
}

/** A forma escolhida no formulário, ou `undefined` se não for uma das quatro. */
export function parseMethod(value: unknown): PaymentMethod | undefined {
  return PAYMENT_METHODS.find((method) => method === value);
}

export const chooseMethodMessage = "Escolha a forma de pagamento.";

/** "terça-feira, 3 de novembro de 2026, às 14:30" (fuso de São Paulo, RN-01). */
export function momentLabel(instant: string): string {
  return `${formatLongDate(localDate(instant))}, às ${formatTime(instant)}`;
}

/**
 * Ainda não chegou o início do agendamento? A API é quem recusa a conclusão
 * antes dele (RN-31); a tela só não oferece o que sabe que será recusado.
 */
export function hasNotStarted(startsAt: string, now: Date): boolean {
  return Date.parse(startsAt) > now.getTime();
}
