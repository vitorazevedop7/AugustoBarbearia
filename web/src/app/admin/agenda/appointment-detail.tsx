import type { ReactNode } from "react";
import { StatusBadge } from "@/components/ui/badge";
import {
  formatDuration,
  formatLongDate,
  formatPhone,
  formatPrice,
  formatTime,
  localDate,
} from "@/lib/format";
import { SOURCE_LABELS, type AgendaAppointment } from "./agenda-state";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-ink-muted">{label}</dt>
      <dd className="min-w-0 text-ink wrap-anywhere">{children}</dd>
    </>
  );
}

/** "terça-feira, 3 de novembro de 2026, às 14:30". */
function moment(instant: string): string {
  return `${formatLongDate(localDate(instant))}, às ${formatTime(instant)}`;
}

/**
 * O detalhe de um agendamento para a administração. `actions` fica no fim do
 * cartão: é o lugar de concluir, marcar falta, remarcar e cancelar (S5.05,
 * S5.06), que a API vai decidir quando aparecem.
 */
export function AppointmentDetail({
  appointment,
  actions,
}: {
  appointment: AgendaAppointment;
  actions?: ReactNode;
}) {
  const { customer } = appointment;
  return (
    <article
      aria-labelledby="agendamento-titulo"
      className="flex max-w-2xl flex-col gap-6 bg-surface p-6 shadow-card sm:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 id="agendamento-titulo" className="text-xl font-semibold text-ink">
          {appointment.service.name}
        </h2>
        <StatusBadge status={appointment.status} />
      </div>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 text-sm">
        <Row label="Dia">
          {formatLongDate(localDate(appointment.starts_at))}
        </Row>
        <Row label="Horário">
          <span className="tabular-nums">
            {formatTime(appointment.starts_at)} às{" "}
            {formatTime(appointment.ends_at)} (
            {formatDuration(appointment.duration_minutes)})
          </span>
        </Row>
        <Row label="Barbeiro">{appointment.barber.name}</Row>
        <Row label="Valor">
          <span className="tabular-nums">{formatPrice(appointment.price)}</span>
        </Row>
        <Row label="Origem">{SOURCE_LABELS[appointment.source]}</Row>
      </dl>
      <section aria-labelledby="cliente-titulo" className="flex flex-col gap-2">
        <h3 id="cliente-titulo" className="font-semibold text-ink">
          Cliente
        </h3>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 text-sm">
          <Row label="Nome">{customer.name}</Row>
          <Row label="Telefone">
            {customer.phone ? (
              <a
                href={`tel:+55${customer.phone}`}
                className="font-semibold text-brand underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                {formatPhone(customer.phone)}
              </a>
            ) : (
              "Não informado"
            )}
          </Row>
          <Row label="E-mail">{customer.email ?? "Não informado"}</Row>
        </dl>
      </section>
      {appointment.status === "CANCELED" && appointment.canceled_at ? (
        <p className="text-sm text-ink-muted">
          Cancelado{" "}
          {appointment.canceled_by === "CUSTOMER"
            ? "pelo cliente"
            : "pela barbearia"}{" "}
          em {moment(appointment.canceled_at)}.
        </p>
      ) : null}
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </article>
  );
}
