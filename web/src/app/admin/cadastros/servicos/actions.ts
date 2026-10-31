"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createApiClient } from "@/lib/api/client";
import { PUBLIC_TAGS } from "@/lib/api/public-tags";
import {
  apiMessage,
  failedState,
  type FormState,
  saveUnavailableMessage,
} from "../../form-state";
import {
  parseServiceForm,
  parseServiceUpdateForm,
  SERVICES_PATH,
} from "./form-data";

export async function createService(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const { error } = await createApiClient().POST("/admin/services", {
      body: parseServiceForm(formData),
    });
    if (error) return failedState(formData, apiMessage(error));
  } catch {
    return failedState(formData, saveUnavailableMessage);
  }
  // A vitrine só lista serviços ativos (RN-61): a mudança vale no próximo carregamento.
  updateTag(PUBLIC_TAGS.services);
  // redirect lança uma exceção do Next e precisa ficar fora do catch de rede.
  revalidatePath(SERVICES_PATH);
  redirect(`${SERVICES_PATH}?aviso=cadastrado`);
}

export async function updateService(
  serviceId: number,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const { error } = await createApiClient().PATCH(
      "/admin/services/{service_id}",
      {
        params: { path: { service_id: serviceId } },
        body: parseServiceUpdateForm(formData),
      },
    );
    if (error) return failedState(formData, apiMessage(error));
  } catch {
    return failedState(formData, saveUnavailableMessage);
  }
  // A vitrine só lista serviços ativos (RN-61): a mudança vale no próximo carregamento.
  updateTag(PUBLIC_TAGS.services);
  // redirect lança uma exceção do Next e precisa ficar fora do catch de rede.
  revalidatePath(SERVICES_PATH);
  revalidatePath(`${SERVICES_PATH}/${serviceId}`);
  redirect(`${SERVICES_PATH}?aviso=atualizado`);
}
