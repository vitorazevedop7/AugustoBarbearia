import type { components } from "@/lib/api/schema";

export type ShopUpdate = components["schemas"]["ShopUpdate"];
export type BusinessHoursDay = components["schemas"]["BusinessHoursDay"];

export const WEEKDAYS = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
  "Domingo",
] as const;

/** Envia os campos como vieram; a API apara, normaliza e valida. */
export function parseShopForm(formData: FormData): ShopUpdate {
  const text = (field: string) => {
    const value = formData.get(field);
    return typeof value === "string" ? value : "";
  };
  return {
    name: text("name"),
    tagline: text("tagline"),
    about: text("about"),
    address: text("address"),
    phone: text("phone"),
    whatsapp: text("whatsapp"),
    instagram: text("instagram"),
    email: text("email"),
  };
}

/**
 * Lê os sete dias do formulário. Dia fechado vai sem horas. A checagem de dia
 * aberto sem hora só ajuda quem digita: a regra (RN-02) é da API.
 */
export function parseBusinessHoursForm(
  formData: FormData,
): { days: BusinessHoursDay[] } | { error: string } {
  const days: BusinessHoursDay[] = [];
  for (const [weekday, name] of WEEKDAYS.entries()) {
    const status = formData.get(`dia-${weekday}-situacao`);
    if (status === "fechado") {
      days.push({ weekday, opens_at: null, closes_at: null });
      continue;
    }
    const opensAt = formData.get(`dia-${weekday}-abertura`);
    const closesAt = formData.get(`dia-${weekday}-fechamento`);
    if (
      typeof opensAt !== "string" ||
      typeof closesAt !== "string" ||
      !opensAt ||
      !closesAt
    ) {
      return {
        error: `${name}: informe a abertura e o fechamento, ou marque como fechado.`,
      };
    }
    days.push({ weekday, opens_at: opensAt, closes_at: closesAt });
  }
  return { days };
}
