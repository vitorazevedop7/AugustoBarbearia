import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { createApiClient } from "@/lib/api/client";
import { AdminPage } from "../../../admin-page";
import { apiMessage } from "../../../form-state";
import { BarberForm } from "../barber-form";
import { parseBarberId } from "../form-data";

export const metadata: Metadata = {
  title: "Editar barbeiro — Administração — Augusto Barbearia",
};

const unavailableMessage =
  "Não foi possível carregar o barbeiro. Tente novamente em instantes.";

export default async function EditarBarbeiroPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const barberId = parseBarberId((await params).id);
  if (barberId === null) notFound();

  let result;
  try {
    result = await createApiClient().GET("/admin/barbers/{barber_id}", {
      params: { path: { barber_id: barberId } },
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    result = undefined;
  }

  // notFound lança uma exceção do Next e precisa ficar fora do catch de rede.
  if (result?.response.status === 404) notFound();

  if (!result?.data) {
    return (
      <AdminPage title="Editar barbeiro">
        <Alert
          tone="danger"
          title={apiMessage(result?.error, unavailableMessage)}
        />
      </AdminPage>
    );
  }

  return (
    <AdminPage title="Editar barbeiro" description={result.data.name}>
      <BarberForm barber={result.data} />
    </AdminPage>
  );
}
