import type { components } from "@/lib/api/schema";

export type Service = components["schemas"]["ServiceResponse"];
export type ServiceCreate = components["schemas"]["ServiceCreate"];
export type ServiceUpdate = components["schemas"]["ServiceUpdate"];
export type Barber = components["schemas"]["BarberResponse"];

export const SERVICES_PATH = "/admin/cadastros/servicos";

/** Prefixo das caixas de seleção dos barbeiros: `barbeiro-<id>`. */
export const BARBER_FIELD_PREFIX = "barbeiro-";
const BARBER_FIELD = /^barbeiro-([1-9]\d{0,9})$/;

/** Avisos que a lista mostra ao voltar de um formulário (`?aviso=`). */
const NOTICES = {
  cadastrado: "Serviço cadastrado.",
  atualizado: "Serviço atualizado.",
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

/** Maior valor de uma coluna `integer` do PostgreSQL. */
const MAX_ID = 2_147_483_647;

/** O `id` da URL, ou `null` se não for um número de serviço possível. */
export function parseServiceId(value: string): number | null {
  if (!/^[1-9]\d{0,9}$/.test(value)) return null;
  const id = Number(value);
  return id <= MAX_ID ? id : null;
}

function text(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}

/** Minutos digitados; o que não for inteiro vira `NaN` (`null` no JSON) e a API recusa. */
function minutes(value: string): number {
  const trimmed = value.trim();
  return /^-?\d+$/.test(trimmed) ? Number(trimmed) : Number.NaN;
}

/** Os barbeiros marcados, pelas caixas `barbeiro-<id>`. */
function barberIds(formData: FormData): number[] {
  const ids: number[] = [];
  for (const key of formData.keys()) {
    const match = BARBER_FIELD.exec(key);
    if (match) ids.push(Number(match[1]));
  }
  return ids;
}

/**
 * Envia os campos como vieram; a API apara, normaliza e valida (RN-61). O preço
 * vai como texto ("25,00"), sem virar `number`.
 */
export function parseServiceForm(formData: FormData): ServiceCreate {
  return {
    name: text(formData, "name"),
    description: text(formData, "description"),
    price: text(formData, "price"),
    duration_minutes: minutes(text(formData, "duration_minutes")),
    barber_ids: barberIds(formData),
  };
}

/** Como `parseServiceForm`, mais a situação, que só existe na edição. */
export function parseServiceUpdateForm(formData: FormData): ServiceUpdate {
  const body: ServiceUpdate = parseServiceForm(formData);
  const status = formData.get("situacao");
  if (status === "ativo") body.active = true;
  if (status === "inativo") body.active = false;
  return body;
}
