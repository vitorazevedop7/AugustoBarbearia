import type { components } from "@/lib/api/schema";

export type Barber = components["schemas"]["BarberResponse"];
export type BarberCreate = components["schemas"]["BarberCreate"];
export type BarberUpdate = components["schemas"]["BarberUpdate"];

export const BARBERS_PATH = "/admin/cadastros/barbeiros";

/** Avisos que a lista mostra ao voltar de um formulário (`?aviso=`). */
const NOTICES = {
  cadastrado: "Barbeiro cadastrado.",
  atualizado: "Barbeiro atualizado.",
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

/** O `id` da URL, ou `null` se não for um número de barbeiro possível. */
export function parseBarberId(value: string): number | null {
  if (!/^[1-9]\d{0,9}$/.test(value)) return null;
  const id = Number(value);
  return id <= MAX_ID ? id : null;
}

function text(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}

/** Envia os campos como vieram; a API apara, normaliza e valida (RN-60). */
export function parseBarberForm(formData: FormData): BarberCreate {
  return {
    name: text(formData, "name"),
    photo_path: text(formData, "photo_path"),
    bio: text(formData, "bio"),
  };
}

/** Como `parseBarberForm`, mais a situação, que só existe na edição. */
export function parseBarberUpdateForm(formData: FormData): BarberUpdate {
  const body: BarberUpdate = parseBarberForm(formData);
  const status = formData.get("situacao");
  if (status === "ativo") body.active = true;
  if (status === "inativo") body.active = false;
  return body;
}
