import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { createApiClient } from "@/lib/api/client";
import { formatDuration, formatList, formatPrice } from "@/lib/format";
import { AdminPage } from "../../admin-page";
import { apiMessage } from "../../form-state";
import { noticeMessage, SERVICES_PATH } from "./form-data";

export const metadata: Metadata = {
  title: "Serviços — Administração — Augusto Barbearia",
};

const unavailableMessage =
  "Não foi possível carregar os serviços. Tente novamente em instantes.";

const description =
  "O que a vitrine oferece, com preço, duração e quem realiza.";

function NewServiceLink() {
  return (
    <ButtonLink
      href={`${SERVICES_PATH}/novo`}
      size="sm"
      className="w-full sm:w-auto"
    >
      Novo serviço
    </ButtonLink>
  );
}

/** Todos os serviços, na ordem da API (ativos primeiro e depois por nome). */
export default async function ServicosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const notice = noticeMessage((await searchParams).aviso);

  let result;
  try {
    result = await createApiClient().GET("/admin/services", {
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    result = undefined;
  }

  if (!result?.data) {
    return (
      <AdminPage title="Serviços" description={description}>
        <Alert
          tone="danger"
          title={apiMessage(result?.error, unavailableMessage)}
        />
      </AdminPage>
    );
  }

  const services = result.data;
  return (
    <AdminPage title="Serviços" description={description}>
      <div className="flex flex-col gap-6">
        {notice ? <Alert tone="success" title={notice} /> : null}
        {services.length === 0 ? (
          <EmptyState
            title="Nenhum serviço cadastrado"
            description="Cadastre os serviços para eles aparecerem na vitrine e receberem agendamentos."
            action={<NewServiceLink />}
          />
        ) : (
          <>
            <div>
              <NewServiceLink />
            </div>
            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <li
                  key={service.id}
                  className="flex flex-col items-start gap-3 bg-surface p-4 shadow-card sm:p-6"
                >
                  <div className="flex w-full items-baseline justify-between gap-4">
                    <p className="min-w-0 font-semibold break-words text-ink">
                      {service.name}
                    </p>
                    <p className="shrink-0 font-semibold text-ink tabular-nums">
                      {formatPrice(service.price)}
                    </p>
                  </div>
                  <p className="text-sm text-ink-muted tabular-nums">
                    {formatDuration(service.duration_minutes)}
                  </p>
                  <p className="text-sm text-ink-muted">
                    Quem realiza:{" "}
                    {formatList(service.barbers.map((barber) => barber.name))}
                  </p>
                  {service.active ? (
                    <Badge tone="success">Ativo</Badge>
                  ) : (
                    <Badge tone="muted">Inativo</Badge>
                  )}
                  <ButtonLink
                    href={`${SERVICES_PATH}/${service.id}`}
                    variant="outline"
                    size="sm"
                    aria-label={`Editar ${service.name}`}
                  >
                    Editar
                  </ButtonLink>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </AdminPage>
  );
}
