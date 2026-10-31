import "server-only";
import { unstable_cache } from "next/cache";
import { connection } from "next/server";
import { cache } from "react";
import { createPublicApiClient } from "./client";
import { PUBLIC_TAGS } from "./public-tags";
import type { components } from "./schema";

export type PublicShop = components["schemas"]["ShopResponse"];
export type PublicService = components["schemas"]["PublicServiceResponse"];
export type PublicBarber = components["schemas"]["PublicBarberResponse"];

const TIMEOUT_MS = 5000;

/**
 * Rede de segurança para mudanças que não passam pelas Server Actions da
 * administração (migração, banco alterado à mão): depois disso, a próxima
 * leitura busca de novo na API em segundo plano.
 */
const REVALIDATE_SECONDS = 300;

/**
 * Leitura da vitrine guardada no cache de dados do Next, com tag. Devolve
 * `null` quando a API não responde, para a página mostrar o aviso só na seção
 * afetada; a falha não entra no cache. O `cache` do React faz o rodapé e a
 * página dividirem a mesma leitura na requisição.
 */
function publicRead<T>(
  tag: string,
  load: (signal: AbortSignal) => Promise<{ data?: T }>,
) {
  const cached = unstable_cache(
    async () => {
      const { data } = await load(AbortSignal.timeout(TIMEOUT_MS));
      // Lança em vez de devolver null: o unstable_cache não guarda exceções.
      if (data === undefined) throw new Error(`Leitura ${tag} sem dados.`);
      return data;
    },
    [tag],
    { tags: [tag], revalidate: REVALIDATE_SECONDS },
  );
  return cache(async (): Promise<T | null> => {
    // A API não existe no build: a página renderiza na requisição, com os
    // dados do cache. Fica fora do try para o Next ver o sinal.
    await connection();
    try {
      return await cached();
    } catch {
      return null;
    }
  });
}

export const getPublicShop = publicRead(PUBLIC_TAGS.shop, (signal) =>
  createPublicApiClient().GET("/public/shop", { signal }),
);

export const getPublicServices = publicRead(PUBLIC_TAGS.services, (signal) =>
  createPublicApiClient().GET("/public/services", { signal }),
);

export const getPublicBarbers = publicRead(PUBLIC_TAGS.barbers, (signal) =>
  createPublicApiClient().GET("/public/barbers", { signal }),
);

export type AvailableSlot = components["schemas"]["AvailableSlot"];

/**
 * Dias da janela do cliente com pelo menos um horário livre (RN-05 a RN-07).
 * A API decide quais dias entram; o web só mostra. A disponibilidade muda a
 * cada agendamento, então não entra no cache de dados.
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
