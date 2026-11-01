"use server";

import { redirect } from "next/navigation";
import { createApiClient } from "@/lib/api/client";
import { positiveInteger } from "@/lib/booking";
import { apiMessage, formValues } from "../form-state";
import {
  actionUnavailableMessage,
  detailWithNotice,
  noticeFor,
  type AdminAction,
  type AdminBookingState,
} from "./admin-booking-state";

const TIMEOUT_MS = 5000;

type ApiResult = {
  data?: {
    id: number;
    starts_at: string;
    notified: boolean;
  };
  error?: unknown;
};

function text(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}

function id(formData: FormData, field: string): number | undefined {
  return positiveInteger(text(formData, field));
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }
  return typeof error.code === "string" ? error.code : undefined;
}

/** Erro: o `message` da API, com o que foi digitado de volta no formulário. */
function failed(formData: FormData, error?: unknown): AdminBookingState {
  const code = errorCode(error);
  return {
    status: "error",
    message: apiMessage(error, actionUnavailableMessage),
    values: formValues(formData),
    ...(code ? { code } : {}),
  };
}

/**
 * Sucesso: vai para o detalhe do agendamento, na agenda do dia dele, com o
 * aviso (que só fala de e-mail se a API o registrou, `notified`, RN-50). `redirect` lança uma exceção do Next, por isso fica fora dos `try`.
 */
function finish(
  result: ApiResult,
  formData: FormData,
  action: AdminAction,
): AdminBookingState {
  if (!result.data) return failed(formData, result.error);
  const { id, starts_at, notified } = result.data;
  redirect(detailWithNotice(id, starts_at, noticeFor(action, notified)));
}

/**
 * Agenda pela administração (RN-20, RN-21). O cliente é o escolhido
 * (`customer_id`) ou um novo, com os campos do `CustomerFields`; a API grava
 * os dois juntos e decide tudo.
 */
export async function createAdminAppointment(
  _previous: AdminBookingState,
  formData: FormData,
): Promise<AdminBookingState> {
  const customerId = id(formData, "customer_id");
  const customer =
    customerId !== undefined
      ? { customer_id: customerId }
      : {
          customer: {
            name: text(formData, "name"),
            phone: text(formData, "phone"),
            email: text(formData, "email"),
          },
        };
  let result: ApiResult;
  try {
    result = await createApiClient().POST("/admin/appointments", {
      body: {
        ...customer,
        barber_id: Number(text(formData, "barber_id")),
        service_id: Number(text(formData, "service_id")),
        starts_at: text(formData, "starts_at"),
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return failed(formData);
  }
  return finish(result, formData, "criado");
}

/** Cancela sem prazo (RN-22); a API confere o status e registra quem foi (RN-33). */
export async function cancelAdminAppointment(
  _previous: AdminBookingState,
  formData: FormData,
): Promise<AdminBookingState> {
  const appointmentId = id(formData, "appointment_id");
  if (appointmentId === undefined) return failed(formData);
  let result: ApiResult;
  try {
    result = await createApiClient().POST(
      "/admin/appointments/{appointment_id}/cancel",
      {
        params: { path: { appointment_id: appointmentId } },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
  } catch {
    return failed(formData);
  }
  return finish(result, formData, "cancelado");
}

/** Remarca sem prazo (RN-15, RN-22). O serviço não vai no pedido: ele não muda. */
export async function rescheduleAdminAppointment(
  _previous: AdminBookingState,
  formData: FormData,
): Promise<AdminBookingState> {
  const appointmentId = id(formData, "appointment_id");
  if (appointmentId === undefined) return failed(formData);
  let result: ApiResult;
  try {
    result = await createApiClient().POST(
      "/admin/appointments/{appointment_id}/reschedule",
      {
        params: { path: { appointment_id: appointmentId } },
        body: {
          starts_at: text(formData, "starts_at"),
          barber_id: Number(text(formData, "barber_id")),
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
  } catch {
    return failed(formData);
  }
  return finish(result, formData, "remarcado");
}
