import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { AdminPage } from "../../admin-page";
import {
  agendaHref,
  type AgendaAppointment,
  appointmentId,
  parseAgendaParams,
  todayInSaoPaulo,
} from "../agenda-state";
import { AppointmentDetail } from "../appointment-detail";
import { AppointmentClosing } from "../conclusao/closing-panel";
import { noticeMessage } from "../conclusao/closing-state";
import { loadAppointment, type Loaded } from "../data";

export const metadata: Metadata = {
  title: "Agendamento — Administração — Augusto Barbearia",
};

const notFoundMessage = "Agendamento não encontrado.";

/**
 * O detalhe de um agendamento; "Voltar" leva à agenda de onde ele foi aberto.
 * Abaixo do cartão fica o fechamento: concluir, falta e pagamento (S5.06).
 */
export default async function AgendaAppointmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const id = appointmentId((await params).id);
  const query = await searchParams;
  const agenda = parseAgendaParams(query, todayInSaoPaulo());
  const back = agendaHref(agenda);
  const notice = noticeMessage(query.aviso);
  // Tipo explícito: sem ele, o TypeScript pode reduzir a união e perder `data`.
  const loaded: Loaded<AgendaAppointment> =
    id === null ? { message: notFoundMessage } : await loadAppointment(id);

  return (
    <AdminPage title="Agendamento">
      <div className="flex flex-col gap-6">
        <div>
          <ButtonLink href={back} variant="ghost" size="sm" className="px-0">
            Voltar para a agenda
          </ButtonLink>
        </div>
        {notice ? <Alert tone="success" title={notice} /> : null}
        {loaded.data ? (
          <>
            <AppointmentDetail appointment={loaded.data} />
            <AppointmentClosing
              appointment={loaded.data}
              agenda={agenda}
              now={new Date()}
            />
          </>
        ) : (
          <Alert tone="danger" title={loaded.message} />
        )}
      </div>
    </AdminPage>
  );
}
