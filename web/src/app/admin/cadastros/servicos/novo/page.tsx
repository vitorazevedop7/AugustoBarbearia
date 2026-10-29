import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { createApiClient } from "@/lib/api/client";
import { AdminPage } from "../../../admin-page";
import { apiMessage } from "../../../form-state";
import { ServiceForm } from "../service-form";

export const metadata: Metadata = {
  title: "Novo serviço — Administração — Augusto Barbearia",
};

const title = "Novo serviço";
const description =
  "O serviço novo já entra ativo, na vitrine e no agendamento.";
const unavailableMessage =
  "Não foi possível carregar os barbeiros. Tente novamente em instantes.";

/** O formulário precisa dos barbeiros para a escolha de quem realiza. */
export default async function NovoServicoPage() {
  let result;
  try {
    result = await createApiClient().GET("/admin/barbers", {
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    result = undefined;
  }

  if (!result?.data) {
    return (
      <AdminPage title={title} description={description}>
        <Alert
          tone="danger"
          title={apiMessage(result?.error, unavailableMessage)}
        />
      </AdminPage>
    );
  }

  return (
    <AdminPage title={title} description={description}>
      <ServiceForm barbers={result.data} />
    </AdminPage>
  );
}
