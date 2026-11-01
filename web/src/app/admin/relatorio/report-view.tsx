import Link from "next/link";
import type { ReactNode } from "react";
import {
  formatPrice,
  formatShortDate,
  formatTime,
  localDate,
} from "@/lib/format";
import { appointmentHref } from "../agenda/agenda-state";
import { METHOD_LABELS } from "../agenda/conclusao/closing-state";
import { countLabel, type FinancialReport } from "./report-state";

/** Os números grandes do período: faturamento, concluídos e faltas (RN-43). */
export function ReportSummary({ report }: { report: FinancialReport }) {
  const cards: { label: string; value: string; strong?: boolean }[] = [
    { label: "Faturamento", value: formatPrice(report.total), strong: true },
    {
      label: "Atendimentos concluídos",
      value: String(report.completed_count),
    },
    { label: "Faltas", value: String(report.no_show_count) },
  ];
  return (
    <dl className="grid gap-4 sm:grid-cols-3">
      {cards.map(({ label, value, strong }) => (
        <div
          key={label}
          className="border-l-4 border-ink bg-surface p-4 shadow-card data-[strong=true]:border-brand"
          data-strong={strong === true}
        >
          <dt className="text-sm font-semibold text-ink-muted">{label}</dt>
          <dd className="mt-1 text-2xl font-semibold text-ink tabular-nums wrap-anywhere">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Breakdown({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h3 id={id} className="text-lg font-semibold text-ink">
        {title}
      </h3>
      <ul className="flex flex-col divide-y divide-line bg-surface shadow-card">
        {children}
      </ul>
    </section>
  );
}

function Row({
  name,
  detail,
  amount,
}: {
  name: string;
  detail: string;
  amount: string;
}) {
  return (
    <li className="flex items-start justify-between gap-4 p-4">
      <span className="min-w-0">
        <span className="block font-semibold text-ink wrap-anywhere">
          {name}
        </span>
        <span className="block text-sm text-ink-muted">{detail}</span>
      </span>
      <span className="shrink-0 font-semibold text-ink tabular-nums">
        {amount}
      </span>
    </li>
  );
}

/** Faturamento por barbeiro (RN-42) e por forma de pagamento (RN-43). */
export function ReportBreakdowns({ report }: { report: FinancialReport }) {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Breakdown id="por-barbeiro" title="Por barbeiro">
        {report.by_barber.map((row) => (
          <Row
            key={row.barber.id}
            name={
              row.barber.active
                ? row.barber.name
                : `${row.barber.name} (inativo)`
            }
            detail={`${countLabel(row.completed_count, "atendimento", "atendimentos")} · ${countLabel(row.no_show_count, "falta", "faltas")}`}
            amount={formatPrice(row.total)}
          />
        ))}
      </Breakdown>
      <Breakdown id="por-forma" title="Por forma de pagamento">
        {report.by_method.map((row) => (
          <Row
            key={row.method}
            name={METHOD_LABELS[row.method]}
            detail={countLabel(row.count, "atendimento", "atendimentos")}
            amount={formatPrice(row.total)}
          />
        ))}
      </Breakdown>
    </div>
  );
}

/** A lista dos concluídos: cada cartão leva ao detalhe do atendimento. */
export function ReportList({ report }: { report: FinancialReport }) {
  return (
    <section aria-labelledby="concluidos" className="flex flex-col gap-3">
      <h3 id="concluidos" className="text-lg font-semibold text-ink">
        Atendimentos concluídos
      </h3>
      {report.completed.length === 0 ? (
        <p className="text-ink-muted">
          Nenhum atendimento concluído neste período.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {report.completed.map((item) => {
            const day = localDate(item.starts_at);
            return (
              <li key={item.appointment_id}>
                <Link
                  href={appointmentHref(item.appointment_id, {
                    data: day,
                    visao: "dia",
                  })}
                  className="flex flex-col gap-1 border-l-4 border-ink bg-surface p-4 shadow-card transition-transform duration-300 ease-standard hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  <span className="flex items-start justify-between gap-4">
                    <span className="text-sm font-semibold text-ink-muted tabular-nums">
                      {formatShortDate(day)} · {formatTime(item.starts_at)}
                    </span>
                    <span className="font-semibold text-ink tabular-nums">
                      {formatPrice(item.amount)}
                    </span>
                  </span>
                  <span className="font-semibold text-ink wrap-anywhere">
                    {item.customer.name}
                  </span>
                  <span className="text-sm text-ink-muted wrap-anywhere">
                    {item.service.name} · {item.barber.name} ·{" "}
                    {METHOD_LABELS[item.method]}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
