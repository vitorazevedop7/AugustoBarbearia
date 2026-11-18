import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  formatDuration,
  formatPrice,
  formatShortDate,
  formatTime,
} from "@/lib/format";
import { appointmentHref } from "../agenda/agenda-state";
import { countLabel } from "../relatorio/report-state";
import {
  CHART_HEIGHT,
  CHART_PEAK_Y,
  CHART_SLOT,
  busiestSlot,
  changeView,
  formatDayRange,
  formatPercent,
  heatLevel,
  revenueBars,
  visiblePeakRows,
  WEEKDAYS,
  type ChangeView,
  type Dashboard,
} from "./dashboard-state";

/** Bloco do painel: título `h2` e o conteúdo num cartão. */
function Panel({
  id,
  title,
  description,
  action,
  className = "",
  children,
}: {
  id: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className={`flex min-w-0 flex-col gap-4 bg-surface p-4 shadow-card sm:p-6 ${className}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h2 id={id} className="text-lg font-semibold text-ink">
            {title}
          </h2>
          {description ? (
            <p className="text-sm text-ink-muted">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

const toneClass: Record<ChangeView["tone"], string> = {
  success: "text-success",
  danger: "text-danger",
  muted: "text-ink-muted",
};

function TrendArrow({ trend }: { trend: ChangeView["trend"] }) {
  if (trend === "none") return null;
  const path =
    trend === "up"
      ? "M12 19V5m-6 6 6-6 6 6"
      : trend === "down"
        ? "M12 5v14m6-6-6 6-6-6"
        : "M5 12h14";
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="square"
    >
      <path d={path} />
    </svg>
  );
}

function Kpi({
  label,
  value,
  change,
  previous,
  strong = false,
}: {
  label: string;
  value: string;
  change: ChangeView;
  previous: string;
  strong?: boolean;
}) {
  return (
    <div
      className="flex min-w-0 flex-col gap-2 border-l-4 border-ink bg-surface p-3 shadow-card data-[strong=true]:border-brand sm:p-5"
      data-strong={strong}
    >
      <dt className="text-sm font-semibold text-ink-muted">{label}</dt>
      <dd className="flex flex-col gap-2">
        <span className="text-2xl font-semibold text-ink tabular-nums wrap-anywhere sm:text-3xl">
          {value}
        </span>
        <span
          className={`inline-flex items-center gap-1 text-sm font-semibold tabular-nums ${toneClass[change.tone]}`}
        >
          <TrendArrow trend={change.trend} />
          <span className="sr-only">{change.label}</span>
          <span aria-hidden="true">{change.text}</span>
        </span>
        <span className="text-sm text-ink-muted tabular-nums">{previous}</span>
      </dd>
    </div>
  );
}

/** Os números do mês até hoje, comparados ao mesmo trecho do anterior (RN-45). */
export function KpiGrid({ dashboard }: { dashboard: Dashboard }) {
  const { current, previous, changes } = dashboard;
  const before = formatDayRange(previous.start, previous.end);
  return (
    <section
      aria-labelledby="indicadores-do-mes"
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <h2 id="indicadores-do-mes" className="text-lg font-semibold text-ink">
          Mês até hoje
        </h2>
        <p className="text-sm text-ink-muted">
          {formatDayRange(current.start, current.end)}, comparado a {before}.
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Kpi
          strong
          label="Faturamento"
          value={formatPrice(current.revenue)}
          change={changeView(changes.revenue)}
          previous={`Antes: ${formatPrice(previous.revenue)}`}
        />
        <Kpi
          label="Atendimentos concluídos"
          value={String(current.completed_count)}
          change={changeView(changes.completed_count)}
          previous={`Antes: ${previous.completed_count}`}
        />
        <Kpi
          label="Ticket médio"
          value={
            current.average_ticket ? formatPrice(current.average_ticket) : "—"
          }
          change={changeView(changes.average_ticket)}
          previous={`Antes: ${
            previous.average_ticket ? formatPrice(previous.average_ticket) : "—"
          }`}
        />
        <Kpi
          label="Taxa de faltas"
          value={
            current.no_show_rate ? formatPercent(current.no_show_rate) : "—"
          }
          change={changeView(changes.no_show_rate, {
            unit: "points",
            higherIsBetter: false,
          })}
          previous={`${countLabel(current.no_show_count, "falta", "faltas")} · antes: ${
            previous.no_show_rate ? formatPercent(previous.no_show_rate) : "—"
          }`}
        />
      </dl>
    </section>
  );
}

/**
 * O faturamento de cada um dos últimos 30 dias, em barras SVG desenhadas no
 * servidor. O desenho é decorativo (`aria-hidden`); a tabela escondida traz os
 * mesmos números ao leitor de tela, e cada barra tem o valor no `title`.
 */
export function RevenueChart({ dashboard }: { dashboard: Dashboard }) {
  const days = dashboard.daily_revenue;
  const { bars, peak } = revenueBars(days);
  const first = days[0];
  const last = days.at(-1);
  const middle = days[Math.floor(days.length / 2)];
  const width = days.length * CHART_SLOT;
  const range = first && last ? formatDayRange(first.date, last.date) : "";
  return (
    <Panel
      id="faturamento-diario"
      title="Faturamento diário"
      description={`Últimos ${days.length} dias · ${range}`}
      className="lg:col-span-2"
    >
      {peak ? (
        <p className="text-sm text-ink">
          Melhor dia:{" "}
          <span className="font-semibold tabular-nums">
            {formatShortDate(peak.date)} · {formatPrice(peak.revenue)}
          </span>
        </p>
      ) : (
        <p className="text-sm text-ink-muted">
          Nenhum atendimento concluído nos últimos {days.length} dias.
        </p>
      )}
      <div className="flex flex-col gap-2">
        <div className="relative">
          {peak ? (
            <span className="absolute top-0 right-0 text-xs text-ink-muted tabular-nums">
              {formatPrice(peak.revenue)}
            </span>
          ) : null}
          <svg
            aria-hidden="true"
            viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
            preserveAspectRatio="none"
            className="mt-5 block h-40 w-full sm:h-52"
          >
            {peak ? (
              <line
                x1="0"
                x2={width}
                y1={CHART_PEAK_Y}
                y2={CHART_PEAK_Y}
                className="stroke-line"
                strokeDasharray="4 4"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
            {bars.map((bar, index) => (
              <rect
                key={bar.date}
                data-day={bar.date}
                x={bar.x}
                y={bar.y}
                width={bar.width}
                height={bar.height}
                className={
                  bar.empty
                    ? "fill-line"
                    : index === bars.length - 1
                      ? "fill-brand"
                      : "fill-ink"
                }
              >
                <title>
                  {`${formatShortDate(bar.date)}: ${formatPrice(bar.revenue)} (${countLabel(bar.completedCount, "atendimento", "atendimentos")})`}
                </title>
              </rect>
            ))}
            <line
              x1="0"
              x2={width}
              y1={CHART_HEIGHT}
              y2={CHART_HEIGHT}
              className="stroke-ink-muted"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
        <div
          aria-hidden="true"
          className="flex justify-between gap-2 text-xs text-ink-muted tabular-nums"
        >
          <span>{first ? formatShortDate(first.date) : null}</span>
          <span className="hidden sm:inline">
            {middle ? formatShortDate(middle.date) : null}
          </span>
          <span className="font-semibold text-brand">Hoje</span>
        </div>
      </div>
      <table className="sr-only">
        <caption>Faturamento por dia, {range}</caption>
        <thead>
          <tr>
            <th scope="col">Dia</th>
            <th scope="col">Faturamento</th>
            <th scope="col">Atendimentos</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day.date}>
              <th scope="row">{formatShortDate(day.date)}</th>
              <td>{formatPrice(day.revenue)}</td>
              <td>{day.completed_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

function OccupancyBar({
  label,
  window,
  fill,
}: {
  label: string;
  window: Dashboard["occupancy"][number]["past"];
  fill: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-ink-muted">{label}</span>
        <span className="font-semibold text-ink tabular-nums">
          {window.rate ? formatPercent(window.rate) : "Sem expediente"}
        </span>
      </div>
      <div aria-hidden="true" className="h-2.5 w-full bg-paper-2">
        <div
          className={`h-full ${fill}`}
          style={{ width: `${window.rate ?? "0"}%` }}
        />
      </div>
      {window.available_minutes > 0 ? (
        <span className="text-xs text-ink-muted tabular-nums">
          {formatDuration(window.booked_minutes)} de{" "}
          {formatDuration(window.available_minutes)}
        </span>
      ) : null}
    </div>
  );
}

/** A ocupação de cada barbeiro ativo na semana que passou e na que vem (RN-45). */
export function OccupancyList({ dashboard }: { dashboard: Dashboard }) {
  return (
    <Panel
      id="ocupacao"
      title="Ocupação por barbeiro"
      description="Tempo agendado sobre o expediente livre de bloqueios."
    >
      {dashboard.occupancy.length === 0 ? (
        <p className="text-sm text-ink-muted">Nenhum barbeiro ativo.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {dashboard.occupancy.map((row) => (
            <li
              key={row.barber_id}
              className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0"
            >
              <span className="font-semibold text-ink wrap-anywhere">
                {row.barber_name}
              </span>
              <div className="grid gap-3 sm:grid-cols-2">
                <OccupancyBar
                  label="Últimos 7 dias"
                  window={row.past}
                  fill="bg-ink"
                />
                <OccupancyBar
                  label="Próximos 7 dias"
                  window={row.upcoming}
                  fill="bg-brand"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

const heatClass = [
  "bg-paper-2 text-ink",
  "bg-brand/15 text-ink",
  "bg-brand/35 text-ink",
  "bg-brand/60 text-ink",
  "bg-brand text-surface",
] as const;

/**
 * Os horários de pico: atendimentos por hora (linhas) e dia da semana
 * (colunas), nos 90 dias antes de hoje (RN-45). É uma tabela de verdade, com
 * o número em cada célula; a cor só reforça.
 */
export function PeakHeatmap({ dashboard }: { dashboard: Dashboard }) {
  const peak = dashboard.peak_hours;
  const rows = visiblePeakRows(peak);
  const busiest = busiestSlot(peak);
  return (
    <Panel
      id="horarios-de-pico"
      title="Horários de pico"
      description={`Atendimentos por início, ${formatDayRange(peak.start, peak.end)}.`}
    >
      {busiest ? (
        <p className="text-sm text-ink">
          Mais cheio:{" "}
          <span className="font-semibold">
            {WEEKDAYS[busiest.weekday]?.long}, {busiest.hour}h
          </span>{" "}
          ({countLabel(busiest.count, "atendimento", "atendimentos")}).
        </p>
      ) : (
        <p className="text-sm text-ink-muted">
          Nenhum atendimento nos últimos 90 dias.
        </p>
      )}
      {peak.hours.length > 0 && rows.length > 0 ? (
        <table className="w-full table-fixed border-separate border-spacing-1 text-xs tabular-nums">
          <caption className="sr-only">
            Atendimentos por hora e dia da semana
          </caption>
          <thead>
            <tr>
              <td className="w-10" />
              {rows.map((row) => (
                <th
                  key={row.weekday}
                  scope="col"
                  className="pb-1 font-semibold text-ink-muted"
                >
                  <abbr
                    title={WEEKDAYS[row.weekday]?.long}
                    className="no-underline"
                  >
                    {WEEKDAYS[row.weekday]?.short}
                  </abbr>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {peak.hours.map((hour, hourIndex) => (
              <tr key={hour}>
                <th
                  scope="row"
                  className="pr-1 text-right font-semibold text-ink-muted"
                >
                  {hour}h
                </th>
                {rows.map((row) => {
                  const count = row.counts[hourIndex] ?? 0;
                  return (
                    <td
                      key={row.weekday}
                      data-level={heatLevel(count, peak.max_count)}
                      className={`h-7 text-center font-semibold ${heatClass[heatLevel(count, peak.max_count)]}`}
                    >
                      {count > 0 ? count : <span className="sr-only">0</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      <div
        aria-hidden="true"
        className="flex items-center justify-end gap-1 text-xs text-ink-muted"
      >
        <span className="mr-1">Menos</span>
        {heatClass.map((className) => (
          <span key={className} className={`size-3.5 ${className}`} />
        ))}
        <span className="ml-1">Mais</span>
      </div>
    </Panel>
  );
}

/** Os atendimentos de hoje que ainda não terminaram, cada um leva ao detalhe. */
export function TodayList({ dashboard }: { dashboard: Dashboard }) {
  const today = dashboard.today;
  return (
    <Panel
      id="hoje"
      title="Hoje"
      description={`${countLabel(today.total_count, "atendimento", "atendimentos")} · ${countLabel(today.completed_count, "concluído", "concluídos")}`}
      action={
        <Link
          href="/admin/agenda"
          className="text-sm font-semibold text-brand underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Ver agenda
        </Link>
      }
    >
      {today.upcoming.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Nenhum atendimento pela frente hoje.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {today.upcoming.map((item) => (
            <li key={item.id}>
              <Link
                href={appointmentHref(item.id, {
                  data: today.date,
                  visao: "dia",
                })}
                className="flex flex-col gap-1 border-l-4 border-ink bg-paper p-3 transition-transform duration-300 ease-standard hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand data-[now=true]:border-brand motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                data-now={item.in_progress}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-ink tabular-nums">
                    {formatTime(item.starts_at)}–{formatTime(item.ends_at)}
                  </span>
                  {item.in_progress ? <Badge tone="brand">Agora</Badge> : null}
                </span>
                <span className="font-semibold text-ink wrap-anywhere">
                  {item.customer_name}
                </span>
                <span className="text-sm text-ink-muted wrap-anywhere">
                  {item.service_name} · {item.barber_name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
