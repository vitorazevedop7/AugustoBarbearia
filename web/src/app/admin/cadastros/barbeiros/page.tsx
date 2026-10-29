import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { createApiClient } from "@/lib/api/client";
import { AdminPage } from "../../admin-page";
import { apiMessage } from "../../form-state";
import { BarberPhoto } from "./barber-photo";
import { BARBERS_PATH, noticeMessage } from "./form-data";

export const metadata: Metadata = {
  title: "Barbeiros — Administração — Augusto Barbearia",
};

const unavailableMessage =
  "Não foi possível carregar os barbeiros. Tente novamente em instantes.";

const description = "Quem aparece na vitrine e recebe agendamentos.";

function NewBarberLink() {
  return (
    <ButtonLink href={`${BARBERS_PATH}/novo`} className="w-full sm:w-auto">
      Novo barbeiro
    </ButtonLink>
  );
}

/** Todos os barbeiros, na ordem da API (ativos primeiro e depois por nome). */
export default async function BarbeirosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const notice = noticeMessage((await searchParams).aviso);

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
      <AdminPage title="Barbeiros" description={description}>
        <Alert
          tone="danger"
          title={apiMessage(result?.error, unavailableMessage)}
        />
      </AdminPage>
    );
  }

  const barbers = result.data;
  return (
    <AdminPage title="Barbeiros" description={description}>
      <div className="flex flex-col gap-6">
        {notice ? <Alert tone="success" title={notice} /> : null}
        {barbers.length === 0 ? (
          <EmptyState
            title="Nenhum barbeiro cadastrado"
            description="Cadastre a equipe para ela aparecer na vitrine e receber agendamentos."
            action={<NewBarberLink />}
          />
        ) : (
          <>
            <div>
              <NewBarberLink />
            </div>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {barbers.map((barber) => (
                <li
                  key={barber.id}
                  className="flex items-center gap-4 bg-surface p-4 shadow-card sm:p-6"
                >
                  <BarberPhoto
                    name={barber.name}
                    photoPath={barber.photo_path}
                    sizes="96px"
                    className="w-20 shrink-0 sm:w-24"
                  />
                  <div className="flex min-w-0 flex-1 flex-col items-start gap-3">
                    <p className="w-full truncate font-semibold text-ink">
                      {barber.name}
                    </p>
                    {barber.active ? (
                      <Badge tone="success">Ativo</Badge>
                    ) : (
                      <Badge tone="muted">Inativo</Badge>
                    )}
                    <ButtonLink
                      href={`${BARBERS_PATH}/${barber.id}`}
                      variant="outline"
                      size="sm"
                      aria-label={`Editar ${barber.name}`}
                    >
                      Editar
                    </ButtonLink>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </AdminPage>
  );
}
