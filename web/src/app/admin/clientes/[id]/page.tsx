import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { createApiClient } from "@/lib/api/client";
import { AdminPage } from "../../admin-page";
import { apiMessage } from "../../form-state";
import { CustomerForm } from "../customer-form";
import { parseCustomerId } from "../form-data";

export const metadata: Metadata = {
  title: "Editar cliente — Administração — Augusto Barbearia",
};

const unavailableMessage =
  "Não foi possível carregar o cliente. Tente novamente em instantes.";

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const customerId = parseCustomerId((await params).id);
  if (customerId === null) notFound();

  let result;
  try {
    result = await createApiClient().GET("/admin/customers/{customer_id}", {
      params: { path: { customer_id: customerId } },
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    result = undefined;
  }

  // notFound lança uma exceção do Next e precisa ficar fora do catch de rede.
  if (result?.response.status === 404) notFound();

  if (!result?.data) {
    return (
      <AdminPage title="Editar cliente">
        <Alert
          tone="danger"
          title={apiMessage(result?.error, unavailableMessage)}
        />
      </AdminPage>
    );
  }

  return (
    <AdminPage
      title="Editar cliente"
      description={
        result.data.has_account
          ? `${result.data.name} tem conta Google e agenda sozinho.`
          : `${result.data.name} ainda não tem conta Google.`
      }
    >
      <CustomerForm customer={result.data} />
    </AdminPage>
  );
}
