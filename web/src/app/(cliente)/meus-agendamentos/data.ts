import "server-only";
import { redirect } from "next/navigation";
import { createApiClient } from "@/lib/api/client";
import type { AvailableSlot } from "@/lib/api/public";
import { getCurrentSession } from "@/lib/session";
import { apiErrorMessage } from "../perfil/profile-state";
import type { MyAppointment, MyAppointments } from "./appointments-state";

const TIMEOUT_MS = 5000;

/** Leitura da API: os dados, ou a mensagem para mostrar no lugar deles. */
export type Loaded<T> = { data: T } | { data?: undefined; message?: string };

/** As telas de "Meus agendamentos" exigem login, voltando para `back`. */
export async function requireSession(back: string) {
  if (!(await getCurrentSession())) {
    redirect(`/entrar?voltar=${encodeURIComponent(back)}`);
  }
}

/**
 * Trata a resposta de uma leitura `/me`. A administração (403) não tem
 * agendamentos de cliente e vai para `/admin` (RN-70). Um 401 com sessão
 * válida (ex.: JWKS indisponível) fica na página, sem ciclo de login. Os
 * outros erros trazem o `message` da API (ex.: agendamento não encontrado).
 */
function settle<T>(result: {
  data?: T;
  error?: unknown;
  response: Response;
}): Loaded<T> {
  if (result.response.status === 403) redirect("/admin");
  if (result.data !== undefined) return { data: result.data };
  return {
    message:
      result.response.status === 401
        ? undefined
        : apiErrorMessage(result.error),
  };
}

export async function loadMyAppointments(): Promise<Loaded<MyAppointments>> {
  let result;
  try {
    result = await createApiClient().GET("/me/appointments", {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return {};
  }
  return settle(result);
}

export async function loadMyAppointment(
  id: number,
): Promise<Loaded<MyAppointment>> {
  let result;
  try {
    result = await createApiClient().GET("/me/appointments/{appointment_id}", {
      params: { path: { appointment_id: id } },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return {};
  }
  return settle(result);
}

/** Dias com horário para remarcar (RN-05 a RN-07, RN-15), decididos pela API. */
export async function loadRescheduleDays(
  id: number,
  barberId: number,
): Promise<Loaded<string[]>> {
  let result;
  try {
    result = await createApiClient().GET(
      "/me/appointments/{appointment_id}/availability/days",
      {
        params: {
          path: { appointment_id: id },
          query: { barber_id: barberId },
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
  } catch {
    return {};
  }
  const settled = settle(result);
  return settled.data ? { data: settled.data.days } : settled;
}

/** Horários de um dia para remarcar, sem o horário atual (RN-15). */
export async function loadRescheduleSlots(
  id: number,
  barberId: number,
  date: string,
): Promise<Loaded<AvailableSlot[]>> {
  let result;
  try {
    result = await createApiClient().GET(
      "/me/appointments/{appointment_id}/availability",
      {
        params: {
          path: { appointment_id: id },
          query: { barber_id: barberId, date },
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
  } catch {
    return {};
  }
  const settled = settle(result);
  return settled.data ? { data: settled.data.slots } : settled;
}
