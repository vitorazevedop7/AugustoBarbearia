import "server-only";
import { createApiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { apiMessage } from "../form-state";
import {
  loadUnavailableMessage,
  type Agenda,
  type AgendaAppointment,
} from "./agenda-state";

const TIMEOUT_MS = 5000;

/** Leitura da API: os dados, ou a mensagem para mostrar no lugar deles. */
export type Loaded<T> = { data: T } | { data?: undefined; message: string };

function settle<T>(result: { data?: T; error?: unknown }): Loaded<T> {
  return result.data !== undefined
    ? { data: result.data }
    : { message: apiMessage(result.error, loadUnavailableMessage) };
}

/** A agenda do período, decidida pela API (RN-01, RN-02, RN-30). */
export async function loadAgenda(period: {
  start: string;
  end: string;
  barberId?: number;
}): Promise<Loaded<Agenda>> {
  try {
    return settle(
      await createApiClient().GET("/admin/appointments", {
        params: {
          query: {
            start: period.start,
            end: period.end,
            barber_id: period.barberId,
          },
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }),
    );
  } catch {
    return { message: loadUnavailableMessage };
  }
}

export async function loadAppointment(
  id: number,
): Promise<Loaded<AgendaAppointment>> {
  try {
    return settle(
      await createApiClient().GET("/admin/appointments/{appointment_id}", {
        params: { path: { appointment_id: id } },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }),
    );
  } catch {
    return { message: loadUnavailableMessage };
  }
}

type Barber = components["schemas"]["BarberResponse"];

/** Todos os barbeiros, para o filtro. Sem eles, a página usa os da agenda. */
export async function loadBarbers(): Promise<Barber[] | undefined> {
  try {
    const result = await createApiClient().GET("/admin/barbers", {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return result.data;
  } catch {
    return undefined;
  }
}
