"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createApiClient } from "@/lib/api/client";
import { PUBLIC_TAGS } from "@/lib/api/public-tags";
import {
  apiMessage,
  type FormState,
  formValues,
  saveUnavailableMessage as unavailable,
} from "../../form-state";
import { parseBusinessHoursForm, parseShopForm } from "./form-data";

const PATH = "/admin/cadastros/barbearia";

export async function saveShop(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const { error } = await createApiClient().PUT("/admin/shop", {
      body: parseShopForm(formData),
    });
    if (error) {
      return {
        status: "error",
        message: apiMessage(error),
        values: formValues(formData),
      };
    }
  } catch {
    return {
      status: "error",
      message: unavailable,
      values: formValues(formData),
    };
  }
  // O nome, o "sobre", o endereço e o contato aparecem na vitrine e no rodapé.
  updateTag(PUBLIC_TAGS.shop);
  revalidatePath(PATH);
  return { status: "success", message: "Dados da barbearia salvos." };
}

export async function saveBusinessHours(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseBusinessHoursForm(formData);
  if ("error" in parsed) {
    return {
      status: "error",
      message: parsed.error,
      values: formValues(formData),
    };
  }
  try {
    const { error } = await createApiClient().PUT("/admin/business-hours", {
      body: parsed.days,
    });
    if (error) {
      return {
        status: "error",
        message: apiMessage(error),
        values: formValues(formData),
      };
    }
  } catch {
    return {
      status: "error",
      message: unavailable,
      values: formValues(formData),
    };
  }
  // O horário de funcionamento (RN-02) aparece na vitrine e no rodapé.
  updateTag(PUBLIC_TAGS.shop);
  revalidatePath(PATH);
  return { status: "success", message: "Horário de funcionamento salvo." };
}
