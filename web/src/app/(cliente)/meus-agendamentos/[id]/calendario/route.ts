import { redirect } from "next/navigation";
import { createApiClient } from "@/lib/api/client";
import { fileResponse, unavailableResponse } from "@/lib/api/download";
import { getCurrentSession } from "@/lib/session";
import { appointmentId, MY_APPOINTMENTS_PATH } from "../../appointments-state";

const TIMEOUT_MS = 8000;

/**
 * O evento de calendário do agendamento (`.ics`): `GET
 * /meus-agendamentos/[id]/calendario`. Sem login, volta para o login; a API
 * decide de quem é o agendamento (RN-16: o de outro cliente é "não
 * encontrado") e se ele ainda está ativo (RN-31).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = appointmentId((await params).id);
  if (id === null) {
    return new Response("Agendamento não encontrado.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  if (!(await getCurrentSession())) {
    redirect(
      `/entrar?voltar=${encodeURIComponent(`${MY_APPOINTMENTS_PATH}/${id}/calendario`)}`,
    );
  }
  try {
    return fileResponse(
      await createApiClient().GET(
        "/me/appointments/{appointment_id}/calendar.ics",
        {
          params: { path: { appointment_id: id } },
          parseAs: "arrayBuffer",
          signal: AbortSignal.timeout(TIMEOUT_MS),
        },
      ),
    );
  } catch {
    return unavailableResponse();
  }
}
