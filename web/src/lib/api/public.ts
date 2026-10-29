import "server-only";
import { cache } from "react";
import { createPublicApiClient } from "./client";
import type { components } from "./schema";

export type PublicShop = components["schemas"]["ShopResponse"];
export type PublicService = components["schemas"]["PublicServiceResponse"];
export type PublicBarber = components["schemas"]["PublicBarberResponse"];

const TIMEOUT_MS = 5000;

/**
 * Leituras da vitrine (rotas `/public`). Cada uma devolve `null` quando a API
 * não responde, para a página mostrar o aviso só na seção afetada. O `cache`
 * do React faz o rodapé e a página dividirem a mesma leitura na requisição.
 */
export const getPublicShop = cache(async (): Promise<PublicShop | null> => {
  try {
    const { data } = await createPublicApiClient().GET("/public/shop", {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return data ?? null;
  } catch {
    return null;
  }
});

export const getPublicServices = cache(
  async (): Promise<PublicService[] | null> => {
    try {
      const { data } = await createPublicApiClient().GET("/public/services", {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      return data ?? null;
    } catch {
      return null;
    }
  },
);

export const getPublicBarbers = cache(
  async (): Promise<PublicBarber[] | null> => {
    try {
      const { data } = await createPublicApiClient().GET("/public/barbers", {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      return data ?? null;
    } catch {
      return null;
    }
  },
);
