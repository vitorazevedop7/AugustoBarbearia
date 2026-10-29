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

export type AvailableSlot = components["schemas"]["AvailableSlot"];

/**
 * Dias da janela do cliente com pelo menos um horário livre (RN-05 a RN-07).
 * A API decide quais dias entram; o web só mostra.
 */
export const getAvailableDays = cache(
  async (barberId: number, serviceId: number): Promise<string[] | null> => {
    try {
      const { data } = await createPublicApiClient().GET(
        "/public/availability/days",
        {
          params: { query: { barber_id: barberId, service_id: serviceId } },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        },
      );
      return data?.days ?? null;
    } catch {
      return null;
    }
  },
);

/** Horários livres do barbeiro para o serviço num dia (RN-05 a RN-07). */
export const getAvailableSlots = cache(
  async (
    barberId: number,
    serviceId: number,
    date: string,
  ): Promise<AvailableSlot[] | null> => {
    try {
      const { data } = await createPublicApiClient().GET(
        "/public/availability",
        {
          params: {
            query: { barber_id: barberId, service_id: serviceId, date },
          },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        },
      );
      return data?.slots ?? null;
    } catch {
      return null;
    }
  },
);
