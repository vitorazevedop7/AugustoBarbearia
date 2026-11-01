import type { ReactNode } from "react";
import { formatPrice } from "@/lib/format";
import type { AgendaAppointment, AgendaState } from "../agenda-state";
import { CompleteForm, CorrectPaymentForm, NoShowForm } from "./closing-forms";
import { hasNotStarted, METHOD_LABELS, momentLabel } from "./closing-state";

function Card({
  titleId,
  title,
  children,
}: {
  titleId: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={titleId}
      className="flex max-w-2xl flex-col gap-5 bg-surface p-6 shadow-card sm:p-8"
    >
      <h2 id={titleId} className="text-xl font-semibold text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-ink-muted">{label}</dt>
      <dd className="min-w-0 text-ink wrap-anywhere">{children}</dd>
    </>
  );
}

/**
 * O fechamento do agendamento na página de detalhe
 * (docs/specs/conclusao-atendimento.md): concluir com pagamento ou marcar
 * falta, o pagamento do concluído com "Corrigir" (RN-40, RN-41) e quem fechou
 * (RN-33). Quem decide o que vale é a API; aqui só se escolhe o que mostrar.
 */
export function AppointmentClosing({
  appointment,
  agenda,
  now,
}: {
  appointment: AgendaAppointment;
  agenda: AgendaState;
  now: Date;
}) {
  const { payment } = appointment;
  const closedBy =
    appointment.closed_by && appointment.closed_at
      ? `por ${appointment.closed_by} em ${momentLabel(appointment.closed_at)}`
      : null;

  if (appointment.status === "SCHEDULED") {
    if (hasNotStarted(appointment.starts_at, now)) {
      return (
        <p className="max-w-2xl text-sm text-ink-muted">
          O atendimento pode ser concluído ou marcado como falta a partir de{" "}
          {momentLabel(appointment.starts_at)}.
        </p>
      );
    }
    return (
      <Card titleId="concluir-titulo" title="Concluir atendimento">
        <CompleteForm
          id={appointment.id}
          agenda={agenda}
          price={appointment.price}
        />
        <hr className="border-line" />
        <NoShowForm id={appointment.id} agenda={agenda} />
      </Card>
    );
  }

  if (appointment.status === "COMPLETED" && payment) {
    return (
      <Card titleId="pagamento-titulo" title="Pagamento">
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 text-sm">
          <Row label="Valor cobrado">
            <span className="tabular-nums">{formatPrice(payment.amount)}</span>
          </Row>
          <Row label="Forma">{METHOD_LABELS[payment.method]}</Row>
          {closedBy ? <Row label="Concluído">{closedBy}</Row> : null}
        </dl>
        <CorrectPaymentForm
          id={appointment.id}
          agenda={agenda}
          amount={payment.amount}
          method={payment.method}
        />
      </Card>
    );
  }

  if (appointment.status === "NO_SHOW" && closedBy) {
    return (
      <p className="max-w-2xl text-sm text-ink-muted wrap-anywhere">
        Falta registrada {closedBy}.
      </p>
    );
  }

  return null;
}
