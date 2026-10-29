import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { createApiClient } from "@/lib/api/client";
import { AdminPage } from "../../../admin-page";
import { apiMessage } from "../../../form-state";
import { parseServiceId } from "../form-data";
import { ServiceForm } from "../service-form";

export const metadata: Metadata = {
  title: "Editar serviço — Administração — Augusto Barbearia",
};

const unavailableMessage =
  "Não foi possível carregar o serviço. Tente novamente em instantes.";

export default async function EditarServicoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const serviceId = parseServiceId((await params).id);
  if (serviceId === null) notFound();

  const api = createApiClient();
  let service;
  let barbers;
  try {
    [service, barbers] = await Promise.all([
      api.GET("/admin/services/{service_id}", {
        params: { path: { service_id: serviceId } },
        signal: AbortSignal.timeout(5000),
      }),
      api.GET("/admin/barbers", { signal: AbortSignal.timeout(5000) }),
    ]);
  } catch {
    service = undefined;
    barbers = undefined;
  }

  // notFound lança uma exceção do Next e precisa ficar fora do catch de rede.
  if (service?.response.status === 404) notFound();

  if (!service?.data || !barbers?.data) {
    return (
      <AdminPage title="Editar serviço">
        <Alert
          tone="danger"
          title={apiMessage(
            service?.error ?? barbers?.error,
            unavailableMessage,
          )}
        />
      </AdminPage>
    );
  }

  return (
    <AdminPage title="Editar serviço" description={service.data.name}>
      <ServiceForm service={service.data} barbers={barbers.data} />
    </AdminPage>
  );
}
