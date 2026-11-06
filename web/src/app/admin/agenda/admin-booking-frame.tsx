import type { ReactNode } from "react";
import {
  ChoiceSummary,
  type SummaryItem,
} from "@/components/booking/booking-frame";
import { ButtonLink } from "@/components/ui/button";
import {
  formatLongDate,
  formatPhone,
  formatTime,
  localDate,
} from "@/lib/format";
import { AdminPage } from "../admin-page";
import { adminCancelHref, adminRescheduleHref } from "./admin-booking-state";
import type { AgendaAppointment } from "./agenda-state";

/**
 * Moldura das etapas do agendamento manual e da remarcação na
 * administração: o título da página (`h1`), "Etapa N de M · X", o título da
 * etapa (`h2`), as escolhas feitas com "Trocar" e o conteúdo.
 */
export function AdminStepFrame({
  pageTitle,
  progress,
  title,
  summary = [],
  children,
}: {
  pageTitle: string;
  progress?: { number: number; total: number; label: string };
  title: string;
  summary?: SummaryItem[];
  children: ReactNode;
}) {
  return (
    <AdminPage title={pageTitle}>
      <div className="flex max-w-3xl flex-col">
        {progress ? (
          <p className="text-sm font-semibold text-ink-muted">
            Etapa {progress.number} de {progress.total} · {progress.label}
          </p>
        ) : null}
        <h2 className="mt-2 text-xl font-semibold text-ink">{title}</h2>
        <ChoiceSummary items={summary} />
        <div className="mt-8 flex flex-col gap-6">{children}</div>
      </div>
    </AdminPage>
  );
}

/**
 * "Remarcar" e "Cancelar" no detalhe. Só o agendamento ativo (`SCHEDULED`,
 * RN-30) muda, sem prazo para a administração (RN-22); a API confere de novo.
 */
export function AdminAppointmentActions({
  appointment,
}: {
  appointment: AgendaAppointment;
}) {
  if (appointment.status !== "SCHEDULED") return null;
  const day = formatLongDate(localDate(appointment.starts_at));
  return (
    <>
      <ButtonLink
        href={adminRescheduleHref(appointment.id, {
          barbeiro: appointment.barber.id,
        })}
        variant="outline"
        size="sm"
        className="w-full sm:w-auto"
      >
        Remarcar <span className="sr-only">o agendamento de {day}</span>
      </ButtonLink>
      <ButtonLink
        href={adminCancelHref(appointment.id)}
        variant="danger"
        size="sm"
        className="w-full sm:w-auto"
      >
        Cancelar <span className="sr-only">o agendamento de {day}</span>
      </ButtonLink>
    </>
  );
}

/** O resumo do agendamento: o que vai mudar. */
export function appointmentSummary(
  appointment: AgendaAppointment,
): SummaryItem[] {
  const { customer } = appointment;
  return [
    { label: "Cliente", value: customer.name },
    ...(customer.phone
      ? [{ label: "Telefone", value: formatPhone(customer.phone) }]
      : []),
    { label: "Serviço", value: appointment.service.name },
    { label: "Barbeiro", value: appointment.barber.name },
    {
      label: "Dia",
      value: formatLongDate(localDate(appointment.starts_at)),
    },
    {
      label: "Horário",
      value: `${formatTime(appointment.starts_at)} às ${formatTime(appointment.ends_at)}`,
    },
  ];
}
