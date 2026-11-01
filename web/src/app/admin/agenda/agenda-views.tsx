import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { formatShortDate } from "@/lib/format";
import { AgendaList } from "./agenda-item";
import {
  appointmentsOn,
  openingLabel,
  type AgendaAppointment,
  type AgendaBarber,
  type AgendaDay,
} from "./agenda-state";

type HrefFor = (appointment: AgendaAppointment) => string;

/**
 * RN-02: o horário de funcionamento do dia, a moldura da agenda. `compact`
 * (nas colunas estreitas da semana) deixa o rótulo só para o leitor de tela.
 */
export function OpeningHours({
  day,
  compact = false,
}: {
  day: AgendaDay;
  compact?: boolean;
}) {
  return (
    <p className="text-sm text-ink-muted">
      <span className={compact ? "sr-only" : undefined}>Funcionamento: </span>
      <span className="tabular-nums">{openingLabel(day)}</span>
    </p>
  );
}

/**
 * Os agendamentos de um barbeiro num dia. `children` entra depois da lista:
 * é o lugar dos bloqueios (S5.04).
 */
export function AgendaBarberColumn({
  barber,
  appointments,
  hrefFor,
  children,
}: {
  barber: AgendaBarber;
  appointments: AgendaAppointment[];
  hrefFor: HrefFor;
  children?: ReactNode;
}) {
  const titleId = `barbeiro-${barber.id}`;
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-2">
        <h3 id={titleId} className="font-semibold text-ink">
          {barber.name}
        </h3>
        {barber.active ? null : <Badge tone="muted">Inativo</Badge>}
      </div>
      <AgendaList appointments={appointments} hrefFor={hrefFor} />
      {children}
    </section>
  );
}

/**
 * A visão do dia: uma lista por barbeiro, uma embaixo da outra no celular e
 * lado a lado a partir do `lg`.
 */
export function AgendaDayView({
  day,
  barbers,
  appointments,
  hrefFor,
  barberExtra,
}: {
  day: AgendaDay;
  barbers: AgendaBarber[];
  appointments: AgendaAppointment[];
  hrefFor: HrefFor;
  /** Conteúdo extra de cada barbeiro (bloqueios, S5.04). */
  barberExtra?: (barber: AgendaBarber) => ReactNode;
}) {
  const columns = barbers.length > 1 ? "lg:grid-cols-3" : "max-w-2xl";
  return (
    <div className="flex flex-col gap-6">
      <OpeningHours day={day} />
      {barbers.length === 0 ? (
        <p className="text-sm text-ink-muted">Nenhum barbeiro ativo.</p>
      ) : (
        <div className={`grid gap-8 ${columns}`}>
          {barbers.map((barber) => (
            <AgendaBarberColumn
              key={barber.id}
              barber={barber}
              appointments={appointments.filter(
                (item) => item.barber.id === barber.id,
              )}
              hrefFor={hrefFor}
            >
              {barberExtra?.(barber)}
            </AgendaBarberColumn>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * A visão da semana: um bloco por dia, um embaixo do outro no celular e em
 * grade no desktop. Com todos os barbeiros, cada item diz com quem é.
 */
export function AgendaWeekView({
  days,
  appointments,
  hrefFor,
  showBarber,
  dayExtra,
}: {
  days: AgendaDay[];
  appointments: AgendaAppointment[];
  hrefFor: HrefFor;
  showBarber: boolean;
  /** Conteúdo extra de cada dia (bloqueios, S5.04). */
  dayExtra?: (day: AgendaDay) => ReactNode;
}) {
  return (
    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 xl:gap-4">
      {days.map((day) => {
        const titleId = `dia-${day.date}`;
        return (
          <section
            key={day.date}
            aria-labelledby={titleId}
            className="flex flex-col gap-3"
          >
            <div className="border-b border-line pb-2">
              <h3 id={titleId} className="font-semibold text-ink">
                {formatShortDate(day.date)}
              </h3>
              <OpeningHours day={day} compact />
            </div>
            <AgendaList
              appointments={appointmentsOn(appointments, day.date)}
              hrefFor={hrefFor}
              showBarber={showBarber}
            />
            {dayExtra?.(day)}
          </section>
        );
      })}
    </div>
  );
}
