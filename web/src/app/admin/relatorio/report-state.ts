import type { components } from "@/lib/api/schema";
import { calendarDate, positiveInteger } from "@/lib/booking";
import { addDays, weekStart } from "../agenda/agenda-state";

export type FinancialReport = components["schemas"]["FinancialReport"];

export const REPORT_PATH = "/admin/relatorio";

export const loadUnavailableMessage =
  "Não foi possível carregar o relatório. Tente novamente em instantes.";

/**
 * O que o relatório mostra (RN-43). Fica na URL
 * (`?inicio=&fim=&barbeiro=`), então os atalhos, o "voltar" do navegador e o
 * formulário funcionam sem JS.
 */
export type ReportState = {
  /** Data local de São Paulo, `AAAA-MM-DD`. */
  inicio: string;
  /** Inclusiva. */
  fim: string;
  /** Sem ele, todos os barbeiros. */
  barbeiro?: number;
};

type Period = Pick<ReportState, "inicio" | "fim">;
type SearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/** O primeiro e o último dia do mês da data. */
export function monthPeriod(date: string): Period {
  const [year, month] = date.split("-").map(Number);
  const first = `${date.slice(0, 7)}-01`;
  const last = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return { inicio: first, fim: last };
}

/** Segunda a domingo da semana da data, como na agenda. */
export function weekPeriod(date: string): Period {
  const start = weekStart(date);
  return { inicio: start, fim: addDays(start, 6) };
}

export function dayPeriod(date: string): Period {
  return { inicio: date, fim: date };
}

/**
 * Lê o estado da URL. Sem as duas datas válidas, vale "Este mês"; a validação
 * do período (ordem, tamanho) é da API, que devolve a mensagem.
 */
export function parseReportParams(
  params: SearchParams,
  today: string,
): ReportState {
  const inicio = calendarDate(single(params.inicio));
  const fim = calendarDate(single(params.fim));
  const state: ReportState =
    inicio !== undefined && fim !== undefined
      ? { inicio, fim }
      : monthPeriod(today);
  const barbeiro = positiveInteger(single(params.barbeiro));
  if (barbeiro !== undefined) state.barbeiro = barbeiro;
  return state;
}

export function reportHref(state: ReportState): string {
  const params = new URLSearchParams({ inicio: state.inicio, fim: state.fim });
  if (state.barbeiro !== undefined)
    params.set("barbeiro", String(state.barbeiro));
  return `${REPORT_PATH}?${params.toString()}`;
}

export const EXPORT_PATH = `${REPORT_PATH}/exportar`;

/** O CSV do mesmo período e barbeiro que a tela mostra. */
export function exportHref(state: ReportState): string {
  return reportHref(state).replace(REPORT_PATH, EXPORT_PATH);
}

export type Shortcut = { label: string; period: Period };

/** Os atalhos de período, na ordem da tela. */
export function shortcuts(today: string): Shortcut[] {
  return [
    { label: "Hoje", period: dayPeriod(today) },
    { label: "Esta semana", period: weekPeriod(today) },
    { label: "Este mês", period: monthPeriod(today) },
  ];
}

export function isSamePeriod(a: Period, b: Period): boolean {
  return a.inicio === b.inicio && a.fim === b.fim;
}

/** "03/11/2026" a partir de `AAAA-MM-DD`, sem passar por fuso. */
function brDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

/** O período por extenso: "03/11/2026" ou "01/11/2026 a 30/11/2026". */
export function formatPeriod(period: Period): string {
  return period.inicio === period.fim
    ? brDate(period.inicio)
    : `${brDate(period.inicio)} a ${brDate(period.fim)}`;
}

/** "1 atendimento" / "3 atendimentos". */
export function countLabel(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}
