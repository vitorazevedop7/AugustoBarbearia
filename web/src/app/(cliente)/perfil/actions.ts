"use server";

import { redirect } from "next/navigation";
import { createApiClient } from "@/lib/api/client";
import { getCurrentSession } from "@/lib/session";
import {
  apiErrorMessage,
  toFormValues,
  unavailableMessage,
  type ProfileFormState,
} from "./profile-state";

/** Salva nome e telefone pela API, que valida o formato e decide (RN-62). */
export async function saveProfile(
  _previous: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const values = {
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
  };
  let result;
  try {
    result = await createApiClient().PATCH("/me/profile", {
      body: values,
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    return { status: "error", message: unavailableMessage, values };
  }

  // redirect lança uma exceção do Next e precisa ficar fora do catch de rede.
  if (result.response.status === 401) {
    if (!(await getCurrentSession())) redirect("/entrar?voltar=/perfil");
    return { status: "error", message: unavailableMessage, values };
  }
  if (result.response.status === 403) redirect("/admin");

  if (!result.data) {
    return {
      status: "error",
      message: apiErrorMessage(result.error) || unavailableMessage,
      values,
    };
  }
  return {
    status: "success",
    message: "Perfil salvo.",
    values: toFormValues(result.data),
  };
}
