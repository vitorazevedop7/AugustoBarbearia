"use server";

import { redirect } from "next/navigation";
import { createApiClient } from "@/lib/api/client";
import { getCurrentSession, safeRedirectPath } from "@/lib/session";
import { apiErrorMessage } from "../perfil/profile-state";
import {
  appointmentId,
  changeUnavailableMessage,
  MY_APPOINTMENTS_PATH,
  type ChangeState,
} from "./appointments-state";

const TIMEOUT_MS = 5000;

type ApiResult = { data?: unknown; error?: unknown; response: Response };

/**
 * Cancela o agendamento pela API, que decide o prazo e o status (RN-14,
 * RN-31, RN-33). Deu certo: volta para a lista com o aviso. Qualquer recusa
 * volta com o `message` da API.
 */
export async function cancelAppointment(
  _previous: ChangeState,
  formData: FormData,
): Promise<ChangeState> {
  const id = appointmentId(String(formData.get("appointment_id") ?? ""));
  if (id === null)
    return { status: "error", message: changeUnavailableMessage };
  let result;
  try {
    result = await createApiClient().POST(
      "/me/appointments/{appointment_id}/cancel",
      {
        params: { path: { appointment_id: id } },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
  } catch {
    return { status: "error", message: changeUnavailableMessage };
  }
  return finish(result, formData, "cancelado");
}

/**
 * Remarca pela API, que confere o prazo, o status e o novo horário (RN-05 a
 * RN-08, RN-14, RN-15). O serviço não vai no pedido: ele não muda.
 */
export async function rescheduleAppointment(
  _previous: ChangeState,
  formData: FormData,
): Promise<ChangeState> {
  const id = appointmentId(String(formData.get("appointment_id") ?? ""));
  if (id === null)
    return { status: "error", message: changeUnavailableMessage };
  let result;
  try {
    result = await createApiClient().POST(
      "/me/appointments/{appointment_id}/reschedule",
      {
        params: { path: { appointment_id: id } },
        body: {
          starts_at: String(formData.get("starts_at") ?? ""),
          barber_id: Number(formData.get("barber_id")),
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
  } catch {
    return { status: "error", message: changeUnavailableMessage };
  }
  return finish(result, formData, "remarcado");
}

/**
 * Sessão encerrada: volta ao login e, depois dele, à mesma tela. A
 * administração vai para `/admin` (RN-70). Um 401 com sessão válida fica na
 * página, sem ciclo de login. `redirect` lança uma exceção do Next, por isso
 * fica fora dos `try`.
 */
async function finish(
  result: ApiResult,
  formData: FormData,
  notice: "cancelado" | "remarcado",
): Promise<ChangeState> {
  const { status } = result.response;
  if (status === 401 && !(await getCurrentSession())) {
    const back = safeRedirectPath(formData.get("voltar"));
    redirect(`/entrar?voltar=${encodeURIComponent(back)}`);
  }
  if (status === 403) redirect("/admin");
  if (result.data === undefined) {
    const code = errorCode(result.error);
    return {
      status: "error",
      message:
        (status !== 401 && apiErrorMessage(result.error)) ||
        changeUnavailableMessage,
      ...(code ? { code } : {}),
    };
  }
  redirect(`${MY_APPOINTMENTS_PATH}?aviso=${notice}`);
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }
  return typeof error.code === "string" ? error.code : undefined;
}
