import type { components } from "@/lib/api/schema";

export type BookedAppointment =
  components["schemas"]["CustomerAppointmentResponse"];

/** Resultado da Server Action de confirmar. `phone` repõe o que foi digitado. */
export type ConfirmState = {
  status: "idle" | "error" | "success";
  message?: string;
  phone: string;
  appointment?: BookedAppointment;
};

/** Onde o cliente acompanha os horários. A página entra na S3.09 (#58). */
export const MY_APPOINTMENTS_PATH = "/meus-agendamentos";

export const confirmUnavailableMessage =
  "Não foi possível confirmar agora. Tente novamente em instantes.";

export const loadUnavailableMessage =
  "Não foi possível carregar os horários. Tente novamente em instantes.";
