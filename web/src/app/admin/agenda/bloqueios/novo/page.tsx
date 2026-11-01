import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { AdminPage } from "../../../admin-page";
import {
  agendaHref,
  loadUnavailableMessage,
  parseAgendaParams,
  todayInSaoPaulo,
} from "../../agenda-state";
import { loadBarbers } from "../../data";
import { backFields } from "../time-block-state";
import { TimeBlockForm } from "../time-block-form";

export const metadata: Metadata = {
  title: "Bloquear horário — Administração — Augusto Barbearia",
};

/**
 * Novo bloqueio ou folga (RN-03). Chega da agenda com o estado dela na URL:
 * a data e o barbeiro já vêm escolhidos, e "Voltar" volta para a mesma visão.
 */
export default async function NewTimeBlockPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const state = parseAgendaParams(await searchParams, todayInSaoPaulo());
  const back = agendaHref(state);
  const barbers = (await loadBarbers())?.filter((barber) => barber.active);

  return (
    <AdminPage
      title="Bloquear horário"
      description="Almoço, folga ou compromisso: os horários bloqueados deixam de ser oferecidos na hora. Só dá para bloquear um intervalo sem clientes agendados."
    >
      {barbers ? (
        <TimeBlockForm
          barbers={barbers}
          defaults={{
            barberId: barbers.some((barber) => barber.id === state.barbeiro)
              ? state.barbeiro
              : undefined,
            date: state.data,
          }}
          hidden={backFields(state)}
          backHref={back}
        />
      ) : (
        <div className="flex flex-col gap-6">
          <Alert tone="danger" title={loadUnavailableMessage} />
          <div>
            <ButtonLink href={back} variant="ghost" size="sm" className="px-0">
              Voltar para a agenda
            </ButtonLink>
          </div>
        </div>
      )}
    </AdminPage>
  );
}
