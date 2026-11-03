import Link from "next/link";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { formatTime } from "@/lib/format";
import type { AgendaAppointment } from "./agenda-state";

/**
 * Um agendamento na agenda: horário, cliente, serviço e status por extenso
 * (RN-30). O cartão inteiro leva ao detalhe, onde ficam as ações.
 */
export function AgendaItem({
  appointment,
  href,
  showBarber = false,
}: {
  appointment: AgendaAppointment;
  href: string;
  /** Na semana com todos os barbeiros, cada item diz com quem é. */
  showBarber?: boolean;
}) {
  const inactive =
    appointment.status === "CANCELED" || appointment.status === "NO_SHOW";
  return (
    <li>
      <Link
        href={href}
        className="flex flex-col gap-1.5 border-l-4 border-ink bg-surface p-3 shadow-card transition-transform duration-300 ease-standard hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none motion-reduce:hover:translate-y-0 data-[inactive=true]:border-line"
        data-inactive={inactive}
      >
        <span className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold text-ink tabular-nums">
            {formatTime(appointment.starts_at)}–
            {formatTime(appointment.ends_at)}
          </span>
          <span className="flex flex-wrap items-center gap-1.5">
            {appointment.canceled_late ? (
              // RN-14 e RN-33: cancelado pelo cliente nas 2 horas antes.
              <Badge tone="warning">Em cima da hora</Badge>
            ) : null}
            <StatusBadge status={appointment.status} />
          </span>
        </span>
        <span className="font-semibold text-ink wrap-anywhere">
          {appointment.customer.name}
        </span>
        <span className="text-sm text-ink-muted">
          {appointment.service.name}
          {showBarber ? ` · ${appointment.barber.name}` : null}
        </span>
      </Link>
    </li>
  );
}

/** A lista de agendamentos de um dia ou de um barbeiro, ou o aviso de vazio. */
export function AgendaList({
  appointments,
  hrefFor,
  showBarber,
}: {
  appointments: AgendaAppointment[];
  hrefFor: (appointment: AgendaAppointment) => string;
  showBarber?: boolean;
}) {
  if (appointments.length === 0) {
    return <p className="text-sm text-ink-muted">Nenhum agendamento.</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {appointments.map((appointment) => (
        <AgendaItem
          key={appointment.id}
          appointment={appointment}
          href={hrefFor(appointment)}
          showBarber={showBarber}
        />
      ))}
    </ul>
  );
}
