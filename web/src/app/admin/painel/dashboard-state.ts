import type { components } from "@/lib/api/schema";
import { shortDateParts } from "@/lib/format";

export type Dashboard = components["schemas"]["Dashboard"];
export type DailyRevenue = components["schemas"]["DailyRevenue"];
export type PeakHours = components["schemas"]["PeakHours"];

export const dashboardUnavailableMessage =
  "Não foi possível carregar os indicadores. Tente novamente em instantes.";

const decimal = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/**
 * Percentual da API, uma string decimal com uma casa ("12.5"), em "12,5%".
 * O `Intl` formata a string sem convertê-la em `number`.
 */
export function formatPercent(value: string): string {
  return `${decimal.format(value as Intl.StringNumericLiteral)}%`;
}

/** Um trecho de dias: "1 a 18 de out", ou "20 de out a 18 de nov". */
export function formatDayRange(start: string, end: string): string {
  const from = shortDateParts(start);
  const to = shortDateParts(end);
  if (start === end) return `${to.day} de ${to.month}`;
  return from.month === to.month && start.slice(0, 4) === end.slice(0, 4)
    ? `${from.day} a ${to.day} de ${to.month}`
    : `${from.day} de ${from.month} a ${to.day} de ${to.month}`;
}

export type Trend = "up" | "down" | "flat" | "none";

/** O sentido de uma variação da API ("21.0", "-5.0", "0.0" ou `null`). */
export function trendOf(value: string | null | undefined): Trend {
  if (value === null || value === undefined) return "none";
  if (/^-?0(\.0+)?$/.test(value)) return "flat";
  return value.startsWith("-") ? "down" : "up";
}

export type ChangeView = {
  trend: Trend;
  /** O texto visível: "21,0%", "3,0 p.p." ou "Sem base". */
  text: string;
  /** A frase para o leitor de tela: "Alta de 21,0%". */
  label: string;
  tone: "success" | "danger" | "muted";
};

/**
 * Uma variação do painel (RN-45) pronta para a tela. `higherIsBetter` decide a
 * cor: para a taxa de faltas, subir é ruim. A cor nunca é a única
 * informação: a seta e o texto dizem o sentido.
 */
export function changeView(
  value: string | null | undefined,
  options: { unit?: "percent" | "points"; higherIsBetter?: boolean } = {},
): ChangeView {
  const { unit = "percent", higherIsBetter = true } = options;
  const trend = trendOf(value);
  if (trend === "none" || value === null || value === undefined) {
    return {
      trend,
      text: "Sem base",
      label: "Sem base de comparação",
      tone: "muted",
    };
  }
  const magnitude = value.replace(/^-/, "");
  const amount =
    unit === "points"
      ? `${decimal.format(magnitude as Intl.StringNumericLiteral)} p.p.`
      : formatPercent(magnitude);
  if (trend === "flat") {
    return { trend, text: amount, label: "Estável", tone: "muted" };
  }
  const good = (trend === "up") === higherIsBetter;
  return {
    trend,
    text: amount,
    label: `${trend === "up" ? "Alta" : "Queda"} de ${amount}`,
    tone: good ? "success" : "danger",
  };
}

/** Altura útil do gráfico de faturamento, nas unidades do `viewBox`. */
export const CHART_HEIGHT = 120;
const CHART_TOP = 8;
/** Largura de cada dia no `viewBox`; a barra ocupa 70% dela. */
export const CHART_SLOT = 10;

export type RevenueBar = {
  date: string;
  revenue: string;
  completedCount: number;
  x: number;
  y: number;
  width: number;
  height: number;
  empty: boolean;
};

/**
 * A geometria das barras do faturamento diário (RN-45). O valor vira `number`
 * só para a altura da barra; o texto mostrado sai sempre da string da API.
 * Dia sem faturamento ganha um traço de 1 unidade, para o dia não sumir.
 */
export function revenueBars(days: DailyRevenue[]): {
  bars: RevenueBar[];
  peak: DailyRevenue | undefined;
} {
  const values = days.map((day) => Number(day.revenue));
  const max = Math.max(0, ...values);
  const peakIndex = max > 0 ? values.indexOf(max) : -1;
  const usable = CHART_HEIGHT - CHART_TOP;
  const bars = days.map((day, index) => {
    const value = values[index] ?? 0;
    const empty = value <= 0;
    const height = empty ? 1 : Math.max(2, (value / max) * usable);
    return {
      date: day.date,
      revenue: day.revenue,
      completedCount: day.completed_count,
      x: index * CHART_SLOT + CHART_SLOT * 0.15,
      y: CHART_HEIGHT - height,
      width: CHART_SLOT * 0.7,
      height,
      empty,
    };
  });
  return { bars, peak: peakIndex >= 0 ? days[peakIndex] : undefined };
}

/** A linha de referência do máximo, no `viewBox`. */
export const CHART_PEAK_Y = CHART_TOP;

/** Intensidade da célula do mapa de calor: 0 (vazia) a 4 (o máximo). */
export function heatLevel(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0 || max <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((count / max) * 4))) as
    1 | 2 | 3 | 4;
}

export const WEEKDAYS = [
  { short: "Seg", long: "segunda-feira" },
  { short: "Ter", long: "terça-feira" },
  { short: "Qua", long: "quarta-feira" },
  { short: "Qui", long: "quinta-feira" },
  { short: "Sex", long: "sexta-feira" },
  { short: "Sáb", long: "sábado" },
  { short: "Dom", long: "domingo" },
] as const;

/**
 * Os dias da semana que o mapa mostra: os abertos e os fechados que tiveram
 * atendimento. Um domingo fechado e vazio só ocuparia espaço.
 */
export function visiblePeakRows(peak: PeakHours): PeakHours["rows"] {
  return peak.rows.filter(
    (row) => row.open || row.counts.some((count) => count > 0),
  );
}

/** O horário mais cheio, ou `undefined` se não houve atendimento. */
export function busiestSlot(
  peak: PeakHours,
): { weekday: number; hour: number; count: number } | undefined {
  if (peak.max_count <= 0) return undefined;
  for (const row of peak.rows) {
    const index = row.counts.indexOf(peak.max_count);
    const hour = peak.hours[index];
    if (index >= 0 && hour !== undefined) {
      return { weekday: row.weekday, hour, count: peak.max_count };
    }
  }
  return undefined;
}
