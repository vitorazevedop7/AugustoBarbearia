import "server-only";
import { createApiClient } from "@/lib/api/client";
import type { AvailableSlot } from "@/lib/api/public";
import { apiMessage } from "../form-state";
import {
  slotsUnavailableMessage,
  type AdminCustomer,
  type AdminCustomerPage,
} from "./admin-booking-state";
import type { Loaded } from "./data";

const TIMEOUT_MS = 5000;
/** Quantos clientes a busca mostra de uma vez. */
export const CUSTOMER_RESULTS = 10;

const customersUnavailableMessage =
  "Não foi possível buscar os clientes. Tente novamente em instantes.";

/** Uma leitura da API: os dados, ou o `message` dela para mostrar no lugar. */
async function read<T>(
  request: (signal: AbortSignal) => Promise<{ data?: T; error?: unknown }>,
  fallback: string,
): Promise<Loaded<T>> {
  try {
    const result = await request(AbortSignal.timeout(TIMEOUT_MS));
    return result.data !== undefined
      ? { data: result.data }
      : { message: apiMessage(result.error, fallback) };
  } catch {
    return { message: fallback };
  }
}

/** Dias com horário para um agendamento novo, com a política da administração (RN-21). */
export async function loadAdminDays(
  barberId: number,
  serviceId: number,
): Promise<Loaded<string[]>> {
  const loaded = await read(
    (signal) =>
      createApiClient().GET("/admin/availability/days", {
        params: { query: { barber_id: barberId, service_id: serviceId } },
        signal,
      }),
    slotsUnavailableMessage,
  );
  return loaded.data ? { data: loaded.data.days } : loaded;
}

/** Horários de um dia para um agendamento novo (RN-21). */
export async function loadAdminSlots(
  barberId: number,
  serviceId: number,
  date: string,
): Promise<Loaded<AvailableSlot[]>> {
  const loaded = await read(
    (signal) =>
      createApiClient().GET("/admin/availability", {
        params: {
          query: { barber_id: barberId, service_id: serviceId, date },
        },
        signal,
      }),
    slotsUnavailableMessage,
  );
  return loaded.data ? { data: loaded.data.slots } : loaded;
}

/** Dias para remarcar: o próprio agendamento não ocupa a agenda (RN-15, RN-22). */
export async function loadAdminRescheduleDays(
  id: number,
  barberId: number,
): Promise<Loaded<string[]>> {
  const loaded = await read(
    (signal) =>
      createApiClient().GET(
        "/admin/appointments/{appointment_id}/availability/days",
        {
          params: {
            path: { appointment_id: id },
            query: { barber_id: barberId },
          },
          signal,
        },
      ),
    slotsUnavailableMessage,
  );
  return loaded.data ? { data: loaded.data.days } : loaded;
}

/** Horários de um dia para remarcar; o horário atual não aparece. */
export async function loadAdminRescheduleSlots(
  id: number,
  barberId: number,
  date: string,
): Promise<Loaded<AvailableSlot[]>> {
  const loaded = await read(
    (signal) =>
      createApiClient().GET(
        "/admin/appointments/{appointment_id}/availability",
        {
          params: {
            path: { appointment_id: id },
            query: { barber_id: barberId, date },
          },
          signal,
        },
      ),
    slotsUnavailableMessage,
  );
  return loaded.data ? { data: loaded.data.slots } : loaded;
}

/** A busca do cadastro de clientes: nome, e-mail ou telefone. */
export function searchCustomers(
  query: string,
): Promise<Loaded<AdminCustomerPage>> {
  return read(
    (signal) =>
      createApiClient().GET("/admin/customers", {
        params: { query: { q: query, page_size: CUSTOMER_RESULTS } },
        signal,
      }),
    customersUnavailableMessage,
  );
}

export function loadCustomer(id: number): Promise<Loaded<AdminCustomer>> {
  return read(
    (signal) =>
      createApiClient().GET("/admin/customers/{customer_id}", {
        params: { path: { customer_id: id } },
        signal,
      }),
    customersUnavailableMessage,
  );
}
