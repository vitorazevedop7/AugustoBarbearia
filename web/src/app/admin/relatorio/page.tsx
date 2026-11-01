import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { loadBarbers } from "../agenda/data";
import { todayInSaoPaulo } from "../agenda/agenda-state";
import { AdminPage } from "../admin-page";
import { loadReport } from "./data";
import { formatPeriod, parseReportParams } from "./report-state";
import { ReportToolbar } from "./report-toolbar";
import { ReportBreakdowns, ReportList, ReportSummary } from "./report-view";

export const metadata: Metadata = {
  title: "Relatório — Administração — Augusto Barbearia",
};

/**
 * O relatório financeiro do período, de todos os barbeiros ou de um (RN-43,
 * RN-70). O estado fica na URL (`?inicio=&fim=&barbeiro=`); a API decide o
 * que entra e valida o período.
 */
export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const today = todayInSaoPaulo();
  const requested = parseReportParams(await searchParams, today);
  const allBarbers = await loadBarbers();
  // Um barbeiro que não existe na lista é ignorado: a tela mostra "Todos" de
  // verdade, em vez de um erro com o filtro fingindo estar limpo. Sem a lista
  // (falha de leitura), a API decide.
  const unknownBarber =
    requested.barbeiro !== undefined &&
    allBarbers !== undefined &&
    !allBarbers.some((barber) => barber.id === requested.barbeiro);
  const state = unknownBarber
    ? { inicio: requested.inicio, fim: requested.fim }
    : requested;
  const report = await loadReport({
    start: state.inicio,
    end: state.fim,
    barberId: state.barbeiro,
  });

  // O filtro mostra os ativos e o escolhido, mesmo inativo.
  const filterBarbers = (
    allBarbers ??
    report.data?.by_barber.map((row) => row.barber) ??
    []
  ).filter((barber) => barber.active || barber.id === state.barbeiro);

  return (
    <AdminPage title="Relatório financeiro">
      <div className="flex flex-col gap-8">
        <ReportToolbar state={state} today={today} barbers={filterBarbers} />
        <section aria-labelledby="periodo" className="flex flex-col gap-6">
          <h2 id="periodo" className="text-lg font-semibold text-ink">
            {formatPeriod(state)}
          </h2>
          {!report.data ? (
            <Alert tone="danger" title={report.message} />
          ) : (
            <>
              <ReportSummary report={report.data} />
              <ReportBreakdowns report={report.data} />
              <ReportList report={report.data} />
            </>
          )}
        </section>
      </div>
    </AdminPage>
  );
}
