import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { createApiClient } from "@/lib/api/client";
import { AdminPage } from "../../admin-page";
import { BusinessHoursForm } from "./business-hours-form";
import { ShopForm } from "./shop-form";

export const metadata: Metadata = {
  title: "Barbearia — Administração — Augusto Barbearia",
};

const unavailableMessage =
  "Não foi possível carregar os dados da barbearia. Tente novamente em instantes.";

export default async function BarbeariaPage() {
  let result;
  try {
    result = await createApiClient().GET("/public/shop", {
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    result = undefined;
  }

  if (!result?.data) {
    return (
      <AdminPage title="Barbearia">
        <Alert tone="danger" title={unavailableMessage} />
      </AdminPage>
    );
  }

  const { business_hours: days, ...shop } = result.data;
  return (
    <AdminPage
      title="Barbearia"
      description="Esses dados aparecem no site e nos e-mails enviados aos clientes."
    >
      <section aria-labelledby="dados" className="flex flex-col gap-6">
        <h2 id="dados" className="text-xl font-semibold text-ink">
          Dados e contato
        </h2>
        <ShopForm shop={shop} />
      </section>
      <section
        aria-labelledby="horario"
        className="mt-12 flex flex-col gap-6 border-t border-line pt-12"
      >
        <h2 id="horario" className="text-xl font-semibold text-ink">
          Horário de funcionamento
        </h2>
        <BusinessHoursForm days={days} />
      </section>
    </AdminPage>
  );
}
