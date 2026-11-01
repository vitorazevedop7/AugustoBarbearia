"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createApiClient } from "@/lib/api/client";
import {
  apiMessage,
  failedState,
  type FormState,
  saveUnavailableMessage,
} from "../../form-state";
import { AGENDA_PATH, type AgendaState } from "../agenda-state";
import {
  chooseMethodMessage,
  noticeHref,
  parseMethod,
  type Notice,
} from "./closing-state";

const TIMEOUT_MS = 5000;

function text(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Depois de gravar, o detalhe volta com o aviso. `redirect` lança uma exceção
 * do Next e precisa ficar fora do `try` da chamada de rede.
 */
function done(id: number, agenda: AgendaState, notice: Notice): never {
  revalidatePath(AGENDA_PATH);
  redirect(noticeHref(id, agenda, notice));
}

/**
 * Conclui o atendimento pela API, que decide o status, o início e o valor
 * (RN-31, RN-40). O valor vazio deixa a API usar o preço congelado (RN-13).
 */
export async function completeAppointment(
  id: number,
  agenda: AgendaState,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const method = parseMethod(formData.get("method"));
  if (!method) return failedState(formData, chooseMethodMessage);
  const amount = text(formData, "amount");
  try {
    const { error } = await createApiClient().POST(
      "/admin/appointments/{appointment_id}/complete",
      {
        params: { path: { appointment_id: id } },
        body: { method, ...(amount ? { amount } : {}) },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
    if (error) return failedState(formData, apiMessage(error));
  } catch {
    return failedState(formData, saveUnavailableMessage);
  }
  return done(id, agenda, "concluido");
}

/** Marca a falta pela API (RN-31). */
export async function markNoShow(
  id: number,
  agenda: AgendaState,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const { error } = await createApiClient().POST(
      "/admin/appointments/{appointment_id}/no-show",
      {
        params: { path: { appointment_id: id } },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
    if (error) return failedState(formData, apiMessage(error));
  } catch {
    return failedState(formData, saveUnavailableMessage);
  }
  return done(id, agenda, "faltou");
}

/** Corrige o valor e a forma de pagamento, sem mudar o status (RN-41). */
export async function correctPayment(
  id: number,
  agenda: AgendaState,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const method = parseMethod(formData.get("method"));
  if (!method) return failedState(formData, chooseMethodMessage);
  const amount = text(formData, "amount");
  try {
    const { error } = await createApiClient().PATCH(
      "/admin/appointments/{appointment_id}/payment",
      {
        params: { path: { appointment_id: id } },
        body: { method, ...(amount ? { amount } : {}) },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
    if (error) return failedState(formData, apiMessage(error));
  } catch {
    return failedState(formData, saveUnavailableMessage);
  }
  return done(id, agenda, "corrigido");
}
