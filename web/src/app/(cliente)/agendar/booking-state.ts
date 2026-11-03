import type { components } from "@/lib/api/schema";

export type BookedAppointment =
  components["schemas"]["CustomerAppointmentResponse"];

/**
 * Resultado da Server Action de confirmar. `phone` repõe o que foi digitado.
 * Deu certo: a action redireciona para `confirmedHref`, que pode ser
 * recarregada sem pedir o horário de novo (#155).
 */
export type ConfirmState = {
  status: "idle" | "error";
  message?: string;
  /** `code` da recusa da API: escolhe o caminho de volta (outro horário ou
   * "Meus agendamentos"). */
  code?: string;
  phone: string;
};

/** A página do horário confirmado: uma URL própria, e não a da confirmação. */
export function confirmedHref(id: number): string {
  return `/agendar/confirmado/${id}`;
}

/** Onde o cliente acompanha, cancela e remarca os horários (S3.09). */
export { MY_APPOINTMENTS_PATH } from "../meus-agendamentos/appointments-state";

export const confirmUnavailableMessage =
  "Não foi possível confirmar agora. Tente novamente em instantes.";

export const loadUnavailableMessage =
  "Não foi possível carregar os horários. Tente novamente em instantes.";
