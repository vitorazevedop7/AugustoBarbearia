import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { formatLongDate } from "@/lib/format";
import { AdminPage } from "../admin-page";
import {
  agendaPeriod,
  appointmentHref,
  formatWeekRange,
  parseAgendaParams,
  todayInSaoPaulo,
} from "./agenda-state";
import { AgendaToolbar } from "./agenda-toolbar";
import { AgendaDayView, AgendaWeekView } from "./agenda-views";
import { loadAgenda, loadBarbers } from "./data";

export const metadata: Metadata = {
  title: "Agenda — Administração — Augusto Barbearia",
};

/**
 * A agenda do dia ou da semana, de todos os barbeiros ou de um (RN-70). O
 * estado fica na URL (`?data=&visao=&barbeiro=`); a API decide o que entra.
 */
export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const today = todayInSaoPaulo();
  const state = parseAgendaParams(await searchParams, today);
  const period = agendaPeriod(state);
  const [agenda, allBarbers] = await Promise.all([
    loadAgenda({ ...period, barberId: state.barbeiro }),
    loadBarbers(),
  ]);

  // O filtro mostra os ativos e o escolhido, mesmo inativo.
  const filterBarbers = (allBarbers ?? agenda.data?.barbers ?? []).filter(
    (barber) => barber.active || barber.id === state.barbeiro,
  );
  const title =
    state.visao === "semana"
      ? formatWeekRange(period.start, period.end)
      : formatLongDate(state.data);
  const hrefFor = ({ id }: { id: number }) => appointmentHref(id, state);

  return (
    <AdminPage title="Agenda">
      <section aria-labelledby="agenda-periodo" className="flex flex-col gap-6">
        <h2
          id="agenda-periodo"
          className="text-lg font-semibold text-ink first-letter:uppercase"
        >
          {title}
        </h2>
        <AgendaToolbar state={state} today={today} barbers={filterBarbers} />
        <div className="mt-2">
          {!agenda.data ? (
            <Alert tone="danger" title={agenda.message} />
          ) : state.visao === "semana" ? (
            <AgendaWeekView
              days={agenda.data.days}
              appointments={agenda.data.appointments}
              hrefFor={hrefFor}
              showBarber={state.barbeiro === undefined}
            />
          ) : (
            <AgendaDayView
              day={agenda.data.days[0]}
              barbers={agenda.data.barbers}
              appointments={agenda.data.appointments}
              hrefFor={hrefFor}
            />
          )}
        </div>
      </section>
    </AdminPage>
  );
}
