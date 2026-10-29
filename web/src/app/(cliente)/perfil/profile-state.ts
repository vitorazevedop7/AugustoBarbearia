import type { components } from "@/lib/api/schema";
import { formatPhone } from "@/lib/phone";

export type CustomerProfile = components["schemas"]["CustomerProfile"];

export type ProfileFormValues = { name: string; phone: string };

export type ProfileFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  values: ProfileFormValues;
};

export const unavailableMessage =
  "Não foi possível carregar seu perfil. Tente novamente em instantes.";

export function toFormValues(profile: CustomerProfile): ProfileFormValues {
  return {
    name: profile.name,
    phone: profile.phone ? formatPhone(profile.phone) : "",
  };
}

/** `message` do erro da API (ADR 0008), quando a resposta segue o contrato. */
export function apiErrorMessage(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("message" in error)) {
    return undefined;
  }
  return typeof error.message === "string" ? error.message : undefined;
}
