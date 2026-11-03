import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { formatLongDate } from "@/lib/format";
import { AdminPage } from "../admin-page";
import {
  agendaPeriod,
  appointmentHref,
  formatWeekRange,
  parseAgendaParams,
  todayInSaoPaulo,
} from "./agenda-state";
import { NEW_APPOINTMENT_PATH } from "./admin-booking-state";
import { AgendaToolbar } from "./agenda-toolbar";
import { AgendaDayView, AgendaWeekView } from "./agenda-views";
import { loadTimeBlocks } from "./bloqueios/data";
import {
  newTimeBlockHref,
  removeTimeBlockHref,
  timeBlockNotice,
  timeBlocksOn,
  withBlockBarbers,
} from "./bloqueios/time-block-state";
import { TimeBlockList } from "./bloqueios/time-blocks";
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
  const params = await searchParams;
  const state = parseAgendaParams(params, today);
  const period = agendaPeriod(state);
  const [agenda, allBarbers, blocks] = await Promise.all([
    loadAgenda({ ...period, barberId: state.barbeiro }),
    loadBarbers(),
    loadTimeBlocks({ ...period, barberId: state.barbeiro }),
  ]);
  const notice = timeBlockNotice(params.aviso);

  // O filtro mostra os ativos e o escolhido, mesmo inativo.
  const filterBarbers = (allBarbers ?? agenda.data?.barbers ?? []).filter(
    (barber) => barber.active || barber.id === state.barbeiro,
  );
  const title =
    state.visao === "semana"
      ? formatWeekRange(period.start, period.end)
      : formatLongDate(state.data);
  const hrefFor = ({ id }: { id: number }) => appointmentHref(id, state);
  // RN-03: os bloqueios do período, depois dos agendamentos de cada coluna.
  const blockList = blocks.data ?? [];
  const removeHrefFor = ({ id }: { id: number }) =>
    removeTimeBlockHref(id, state);

  return (
    <AdminPage title="Agenda">
      <section aria-labelledby="agenda-periodo" className="flex flex-col gap-6">
        <h2
          id="agenda-periodo"
          className="text-lg font-semibold text-ink first-letter:uppercase"
        >
          {title}
        </h2>
        {notice ? (
          <Alert tone="success" revealOnMount="top" title={notice} />
        ) : null}
        <AgendaToolbar
          state={state}
          today={today}
          barbers={filterBarbers}
          actions={
            <>
              <ButtonLink href={NEW_APPOINTMENT_PATH} size="sm">
                Novo agendamento
              </ButtonLink>
              <ButtonLink
                href={newTimeBlockHref(state)}
                variant="outline"
                size="sm"
              >
                Bloquear horário
              </ButtonLink>
            </>
          }
        />
        {agenda.data && !blocks.data ? (
          <Alert tone="warning" title={blocks.message} />
        ) : null}
        <div className="mt-2">
          {!agenda.data ? (
            <Alert tone="danger" title={agenda.message} />
          ) : state.visao === "semana" ? (
            <AgendaWeekView
              days={agenda.data.days}
              appointments={agenda.data.appointments}
              hrefFor={hrefFor}
              showBarber={state.barbeiro === undefined}
              dayExtra={(day) => (
                <TimeBlockList
                  blocks={timeBlocksOn(blockList, day.date)}
                  removeHrefFor={removeHrefFor}
                  showBarber={state.barbeiro === undefined}
                />
              )}
            />
          ) : (
            <AgendaDayView
              day={agenda.data.days[0]}
              barbers={withBlockBarbers(agenda.data.barbers, blockList)}
              appointments={agenda.data.appointments}
              hrefFor={hrefFor}
              barberExtra={(barber) => (
                <TimeBlockList
                  blocks={blockList.filter(
                    (block) => block.barber.id === barber.id,
                  )}
                  removeHrefFor={removeHrefFor}
                />
              )}
            />
          )}
        </div>
      </section>
    </AdminPage>
  );
}
