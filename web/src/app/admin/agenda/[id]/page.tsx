import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { AdminPage } from "../../admin-page";
import {
  agendaHref,
  appointmentId,
  parseAgendaParams,
  todayInSaoPaulo,
} from "../agenda-state";
import { AppointmentDetail } from "../appointment-detail";
import { loadAppointment } from "../data";

export const metadata: Metadata = {
  title: "Agendamento — Administração — Augusto Barbearia",
};

const notFoundMessage = "Agendamento não encontrado.";

/** O detalhe de um agendamento; "Voltar" leva à agenda de onde ele foi aberto. */
export default async function AgendaAppointmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const id = appointmentId((await params).id);
  const back = agendaHref(
    parseAgendaParams(await searchParams, todayInSaoPaulo()),
  );
  const loaded =
    id === null ? { message: notFoundMessage } : await loadAppointment(id);

  return (
    <AdminPage title="Agendamento">
      <div className="flex flex-col gap-6">
        <div>
          <ButtonLink href={back} variant="ghost" size="sm" className="px-0">
            Voltar para a agenda
          </ButtonLink>
        </div>
        {loaded.data ? (
          <AppointmentDetail appointment={loaded.data} />
        ) : (
          <Alert tone="danger" title={loaded.message} />
        )}
      </div>
    </AdminPage>
  );
}
