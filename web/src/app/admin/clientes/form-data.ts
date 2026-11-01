import type { components } from "@/lib/api/schema";

export type Customer = components["schemas"]["CustomerResponse"];
export type CustomerCreate = components["schemas"]["CustomerCreate"];
export type CustomerUpdate = components["schemas"]["CustomerUpdate"];

export const CUSTOMERS_PATH = "/admin/clientes";
/** Clientes por página da lista (a API aceita de 1 a 50). */
export const PAGE_SIZE = 20;

/** Avisos que a lista mostra ao voltar de um formulário (`?aviso=`). */
const NOTICES = {
  cadastrado: "Cliente cadastrado.",
  atualizado: "Cliente atualizado.",
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

/** O `id` da URL, ou `null` se não for um número de cliente possível. */
export function parseCustomerId(value: string): number | null {
  if (!/^[1-9]\d{0,9}$/.test(value)) return null;
  const id = Number(value);
  return id <= MAX_ID ? id : null;
}

/** A página da URL (`?pagina=`); qualquer valor inválido volta para a primeira. */
export function parsePage(value: string | string[] | undefined): number {
  if (typeof value !== "string" || !/^[1-9]\d{0,4}$/.test(value)) return 1;
  return Number(value);
}

/** O texto da busca (`?q=`), sem espaços nas pontas. */
export function parseQuery(value: string | string[] | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Endereço da lista, mantendo a busca e a página só quando valem a pena. */
export function listHref({ q, page }: { q: string; page: number }): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (page > 1) params.set("pagina", String(page));
  const query = params.toString();
  return query ? `${CUSTOMERS_PATH}?${query}` : CUSTOMERS_PATH;
}

function text(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}

/** Envia os campos como vieram; a API apara, normaliza e valida (RN-20, RN-62). */
export function parseCustomerForm(formData: FormData): CustomerCreate {
  return {
    name: text(formData, "name"),
    phone: text(formData, "phone"),
    email: text(formData, "email"),
  };
}

/**
 * Como `parseCustomerForm`, mas telefone em branco não é enviado: o telefone é
 * obrigatório e não se apaga (RN-62), só se informa.
 */
export function parseCustomerUpdateForm(formData: FormData): CustomerUpdate {
  const { name, phone, email } = parseCustomerForm(formData);
  return { name, email, ...(phone.trim() ? { phone } : {}) };
}
