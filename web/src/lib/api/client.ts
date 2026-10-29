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
  const client = createBaseClient();
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

/**
 * Cliente das rotas `/public` (vitrine): nunca envia token. A vitrine não
 * depende da sessão, então não emite um JWT a cada leitura pública.
 */
export function createPublicApiClient() {
  return createBaseClient();
}

function createBaseClient() {
  const baseUrl = process.env.API_INTERNAL_URL;
  if (!baseUrl) {
    throw new Error("API_INTERNAL_URL não está configurada.");
  }
  return createClient<paths>({ baseUrl, cache: "no-store" });
}

export type ApiClient = ReturnType<typeof createApiClient>;
