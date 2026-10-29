import "server-only";
import createClient from "openapi-fetch";
import { getApiToken } from "./token";
import type { paths } from "./schema";

/**
 * Cliente HTTP tipado da API (ADR 0008), com os tipos gerados por `pnpm gen:api`.
 * Só roda no servidor (Server Components e Server Actions): o navegador nunca
 * chama a API. Cada requisição obtém o JWT da sessão atual com `getApiToken()`.
 */
export function createApiClient() {
  const baseUrl = process.env.API_INTERNAL_URL;
  if (!baseUrl) {
    throw new Error("API_INTERNAL_URL não está configurada.");
  }
  const client = createClient<paths>({
    baseUrl,
    cache: "no-store",
  });
  client.use({
    async onRequest({ request }) {
      const token = await getApiToken();
      if (token) {
        request.headers.set("Authorization", `Bearer ${token}`);
      } else {
        request.headers.delete("Authorization");
      }
      return request;
    },
  });
  return client;
}

export type ApiClient = ReturnType<typeof createApiClient>;
