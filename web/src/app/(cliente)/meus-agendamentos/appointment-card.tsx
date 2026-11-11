import type { SummaryItem } from "@/components/booking/booking-frame";
import { ContactNotice } from "@/components/booking/contact-notice";
import { Alert } from "@/components/ui/alert";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import type { ShopContact } from "@/lib/contact";
import {
  formatDuration,
  formatLongDate,
  formatPrice,
  formatTime,
  localDate,
} from "@/lib/format";
import {
  cancelHref,
  rescheduleHref,
  type MyAppointment,
} from "./appointments-state";

/** "terça-feira, 3 de novembro de 2026" de um instante da API. */
export function appointmentDate(instant: string): string {
  return formatLongDate(localDate(instant));
}

/** "terça-feira, 3 de novembro de 2026, às 08:00". */
function deadlineText(instant: string): string {
  return `${appointmentDate(instant)}, às ${formatTime(instant)}`;
}

/** O aviso do cartão e da remarcação nas 2 horas antes do horário (RN-14). */
export const LATE_TITLE = "Seu horário é daqui a pouco.";

/**
 * Um agendamento do cliente. As ações aparecem conforme `can_cancel` e
 * `can_reschedule`, que a API calcula (RN-14); sem elas, um próximo horário
 * mostra o contato da barbearia. Nas últimas 2 horas (`late_change`), as
 * ações continuam, com o aviso e os contatos acima delas.
 */
export function AppointmentCard({
  appointment,
  upcoming,
  shop,
}: {
  appointment: MyAppointment;
  /** Na lista de próximos; no histórico, nenhuma ação aparece. */
  upcoming: boolean;
  shop: ShopContact | null;
}) {
  const date = appointmentDate(appointment.starts_at);
  const titleId = `agendamento-${appointment.id}`;
  const actionable =
    upcoming && (appointment.can_cancel || appointment.can_reschedule);

  return (
    <article
      aria-labelledby={titleId}
      className="flex flex-col gap-4 bg-surface p-5 shadow-card sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3
          id={titleId}
          className="font-heading text-display-4 font-normal text-ink"
        >
          {appointment.service.name}
        </h3>
        {appointment.status === "SCHEDULED" && !upcoming ? (
          // RN-31: já passou e espera a administração concluir ou marcar falta.
          <Badge tone="muted">Aguardando registro</Badge>
        ) : (
          <StatusBadge status={appointment.status} />
        )}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-ink-muted">Dia</dt>
        <dd className="text-ink">{date}</dd>
        <dt className="text-ink-muted">Horário</dt>
        <dd className="text-ink tabular-nums">
          {formatTime(appointment.starts_at)} às{" "}
          {formatTime(appointment.ends_at)} (
          {formatDuration(appointment.duration_minutes)})
        </dd>
        <dt className="text-ink-muted">Barbeiro</dt>
        <dd className="text-ink">{appointment.barber.name}</dd>
        <dt className="text-ink-muted">Valor</dt>
        <dd className="text-ink tabular-nums">
          {formatPrice(appointment.price)}
        </dd>
      </dl>
      {appointment.status === "CANCELED" && appointment.canceled_at ? (
        <p className="text-sm text-ink-muted">
          Cancelado{" "}
          {appointment.canceled_by === "CUSTOMER"
            ? "por você"
            : "pela barbearia"}{" "}
          em {deadlineText(appointment.canceled_at)}.
        </p>
      ) : null}
      {actionable ? (
        <>
          {appointment.late_change ? (
            <ContactNotice shop={shop} title={LATE_TITLE}>
              Se surgiu um imprevisto, ainda dá para remarcar ou cancelar por
              aqui. Vai só se atrasar? Fale com a barbearia antes de cancelar:
              talvez ainda dê para te atender.
            </ContactNotice>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row">
            {appointment.can_reschedule ? (
              <ButtonLink
                href={rescheduleHref(appointment.id, {
                  barbeiro: appointment.barber.id,
                })}
                variant="outline"
                size="sm"
              >
                Remarcar <span className="sr-only">o horário de {date}</span>
              </ButtonLink>
            ) : null}
            {appointment.can_cancel ? (
              <ButtonLink
                href={cancelHref(appointment.id)}
                variant="danger"
                size="sm"
              >
                Cancelar <span className="sr-only">o horário de {date}</span>
              </ButtonLink>
            ) : null}
          </div>
        </>
      ) : upcoming ? (
        <ContactNotice shop={shop} />
      ) : null}
    </article>
  );
}

/** O agendamento como resumo das telas de cancelar e remarcar. */
export function appointmentSummary(appointment: MyAppointment): SummaryItem[] {
  return [
    {
      label: "Serviço",
      value: `${appointment.service.name} · ${formatDuration(appointment.duration_minutes)} · ${formatPrice(appointment.price)}`,
    },
    { label: "Barbeiro", value: appointment.barber.name },
    { label: "Dia", value: appointmentDate(appointment.starts_at) },
    {
      label: "Horário",
      value: `${formatTime(appointment.starts_at)} às ${formatTime(appointment.ends_at)}`,
    },
  ];
}

/**
 * No lugar das ações, quando a API já não permite a alteração: o contato da
 * barbearia se o horário já começou (RN-14), ou o aviso de que o agendamento
 * não está mais ativo (RN-31).
 */
export function ChangeUnavailable({
  appointment,
  shop,
}: {
  appointment: MyAppointment;
  shop: ShopContact | null;
}) {
  return appointment.status === "SCHEDULED" ? (
    <ContactNotice shop={shop} />
  ) : (
    <Alert tone="warning" title="Este agendamento não está mais ativo." />
  );
}
