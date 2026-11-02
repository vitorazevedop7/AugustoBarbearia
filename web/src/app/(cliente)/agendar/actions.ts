"use server";

import { redirect } from "next/navigation";
import { createApiClient } from "@/lib/api/client";
import { getCurrentSession, safeRedirectPath } from "@/lib/session";
import { apiErrorCode, apiErrorMessage } from "../perfil/profile-state";
import { confirmUnavailableMessage, type ConfirmState } from "./booking-state";

const TIMEOUT_MS = 5000;

/**
 * Confirma o agendamento pela API, que decide tudo (RN-05 a RN-13). Sem
 * telefone no perfil, o formulário traz o campo, e ele é salvo antes (RN-10).
 * Qualquer recusa volta com o `message` da API.
 */
export async function confirmBooking(
  _previous: ConfirmState,
  formData: FormData,
): Promise<ConfirmState> {
  const phoneField = formData.get("phone");
  const phone = typeof phoneField === "string" ? phoneField : "";
  const back = safeRedirectPath(formData.get("voltar"));
  const failed = (message?: string, code?: string): ConfirmState => ({
    status: "error",
    message: message || confirmUnavailableMessage,
    code,
    phone,
  });
  const client = createApiClient();

  if (typeof phoneField === "string") {
    let saved;
    try {
      saved = await client.PATCH("/me/profile", {
        body: { phone },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      return failed();
    }
    await leaveWhenNotCustomer(saved.response.status, back);
    if (!saved.data) {
      return saved.response.status === 401
        ? failed()
        : failed(apiErrorMessage(saved.error), apiErrorCode(saved.error));
    }
  }

  let created;
  try {
    created = await client.POST("/me/appointments", {
      body: {
        barber_id: Number(formData.get("barber_id")),
        service_id: Number(formData.get("service_id")),
        starts_at: String(formData.get("starts_at") ?? ""),
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return failed();
  }
  await leaveWhenNotCustomer(created.response.status, back);
  if (!created.data) {
    return created.response.status === 401
      ? failed()
      : failed(apiErrorMessage(created.error), apiErrorCode(created.error));
  }
  return { status: "success", phone, appointment: created.data };
}

/**
 * Sessão encerrada: volta ao login e, depois dele, à mesma confirmação. A
 * administração não agenda para si (RN-70) e vai para `/admin`. Um 401 com
 * sessão válida (ex.: JWKS indisponível) fica na página, sem ciclo de login.
 * `redirect` lança uma exceção do Next, por isso fica fora dos `try`.
 */
async function leaveWhenNotCustomer(status: number, back: string) {
  if (status === 401 && !(await getCurrentSession())) {
    redirect(`/entrar?voltar=${encodeURIComponent(back)}`);
  }
  if (status === 403) redirect("/admin");
}
