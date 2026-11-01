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
import { AGENDA_PATH, todayInSaoPaulo } from "../agenda-state";
import {
  agendaWithNotice,
  backState,
  parseTimeBlockForm,
  timeBlockId,
} from "./time-block-state";

const TIMEOUT_MS = 5000;

/**
 * Cria o bloqueio pela API, que decide tudo: o intervalo, a folga do dia
 * inteiro e a recusa sobre agendamento ativo (RN-03). Deu certo: volta para a
 * agenda no dia do bloqueio, com o aviso.
 */
export async function createTimeBlock(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const { error } = await createApiClient().POST("/admin/time-blocks", {
      body: parseTimeBlockForm(formData),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (error) return failedState(formData, apiMessage(error));
  } catch {
    return failedState(formData, saveUnavailableMessage);
  }
  // redirect lança uma exceção do Next e precisa ficar fora do catch de rede.
  revalidatePath(AGENDA_PATH);
  redirect(
    agendaWithNotice(backState(formData, todayInSaoPaulo()), "bloqueado"),
  );
}

/** Remove o bloqueio; os horários voltam a ser oferecidos na hora (RN-05). */
export async function deleteTimeBlock(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = timeBlockId(String(formData.get("block_id") ?? ""));
  if (id === null) return { status: "error", message: saveUnavailableMessage };
  try {
    const { error } = await createApiClient().DELETE(
      "/admin/time-blocks/{block_id}",
      {
        params: { path: { block_id: id } },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
    if (error) return { status: "error", message: apiMessage(error) };
  } catch {
    return { status: "error", message: saveUnavailableMessage };
  }
  revalidatePath(AGENDA_PATH);
  redirect(
    agendaWithNotice(
      backState(formData, todayInSaoPaulo()),
      "bloqueio-removido",
    ),
  );
}
