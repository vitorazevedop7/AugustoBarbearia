import type { components } from "@/lib/api/schema";

export type BookedAppointment =
  components["schemas"]["CustomerAppointmentResponse"];

/** Resultado da Server Action de confirmar. `phone` repõe o que foi digitado. */
export type ConfirmState = {
  status: "idle" | "error" | "success";
  message?: string;
  /** `code` da recusa da API: só `SLOT_UNAVAILABLE` leva a outro horário. */
  code?: string;
  phone: string;
  appointment?: BookedAppointment;
};

/** Onde o cliente acompanha, cancela e remarca os horários (S3.09). */
export { MY_APPOINTMENTS_PATH } from "../meus-agendamentos/appointments-state";

export const confirmUnavailableMessage =
  "Não foi possível confirmar agora. Tente novamente em instantes.";

export const loadUnavailableMessage =
  "Não foi possível carregar os horários. Tente novamente em instantes.";
