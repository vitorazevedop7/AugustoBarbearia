import createClient from "openapi-fetch";
import type { paths } from "./schema";

/**
 * Cliente HTTP tipado da API (ADR 0008), com os tipos gerados por `pnpm gen:api`.
 * Só roda no servidor (Server Components e Server Actions): o navegador nunca
 * chama a API. Com `token` (ver `getApiToken()`), envia o JWT como `Bearer`.
 */
export function createApiClient({ token }: { token?: string | null } = {}) {
  const baseUrl = process.env.API_INTERNAL_URL;
  if (!baseUrl) {
    throw new Error("API_INTERNAL_URL não está configurada.");
  }
  return createClient<paths>({
    baseUrl,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

export type ApiClient = ReturnType<typeof createApiClient>;
