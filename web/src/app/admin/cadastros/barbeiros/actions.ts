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
  BARBERS_PATH,
  parseBarberForm,
  parseBarberUpdateForm,
} from "./form-data";

export async function createBarber(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const { error } = await createApiClient().POST("/admin/barbers", {
      body: parseBarberForm(formData),
    });
    if (error) return failedState(formData, apiMessage(error));
  } catch {
    return failedState(formData, saveUnavailableMessage);
  }
  refreshVitrine();
  // redirect lança uma exceção do Next e precisa ficar fora do catch de rede.
  revalidatePath(BARBERS_PATH);
  redirect(`${BARBERS_PATH}?aviso=cadastrado`);
}

export async function updateBarber(
  barberId: number,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const { error } = await createApiClient().PATCH(
      "/admin/barbers/{barber_id}",
      {
        params: { path: { barber_id: barberId } },
        body: parseBarberUpdateForm(formData),
      },
    );
    if (error) return failedState(formData, apiMessage(error));
  } catch {
    return failedState(formData, saveUnavailableMessage);
  }
  refreshVitrine();
  // redirect lança uma exceção do Next e precisa ficar fora do catch de rede.
  revalidatePath(BARBERS_PATH);
  revalidatePath(`${BARBERS_PATH}/${barberId}`);
  redirect(`${BARBERS_PATH}?aviso=atualizado`);
}

/**
 * A vitrine mostra a equipe e, em cada serviço, quem o realiza: mudar um
 * barbeiro muda as duas leituras (RN-60).
 */
function refreshVitrine() {
  updateTag(PUBLIC_TAGS.barbers);
  updateTag(PUBLIC_TAGS.services);
}
