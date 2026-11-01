"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createApiClient } from "@/lib/api/client";
import {
  apiMessage,
  failedState,
  type FormState,
  saveUnavailableMessage,
} from "../form-state";
import {
  CUSTOMERS_PATH,
  parseCustomerForm,
  parseCustomerUpdateForm,
} from "./form-data";

export async function createCustomer(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const { error } = await createApiClient().POST("/admin/customers", {
      body: parseCustomerForm(formData),
    });
    if (error) return failedState(formData, apiMessage(error));
  } catch {
    return failedState(formData, saveUnavailableMessage);
  }
  // redirect lança uma exceção do Next e precisa ficar fora do catch de rede.
  revalidatePath(CUSTOMERS_PATH);
  redirect(`${CUSTOMERS_PATH}?aviso=cadastrado`);
}

export async function updateCustomer(
  customerId: number,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const { error } = await createApiClient().PATCH(
      "/admin/customers/{customer_id}",
      {
        params: { path: { customer_id: customerId } },
        body: parseCustomerUpdateForm(formData),
      },
    );
    if (error) return failedState(formData, apiMessage(error));
  } catch {
    return failedState(formData, saveUnavailableMessage);
  }
  // redirect lança uma exceção do Next e precisa ficar fora do catch de rede.
  revalidatePath(CUSTOMERS_PATH);
  revalidatePath(`${CUSTOMERS_PATH}/${customerId}`);
  redirect(`${CUSTOMERS_PATH}?aviso=atualizado`);
}
