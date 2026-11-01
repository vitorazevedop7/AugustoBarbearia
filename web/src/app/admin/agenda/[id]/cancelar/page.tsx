import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { localDate } from "@/lib/format";
import { cancelAdminAppointment } from "../../admin-booking-actions";
import { AdminBookingForm } from "../../admin-booking-form";
import { AdminStepFrame, appointmentSummary } from "../../admin-booking-frame";
import { notActiveMessage } from "../../admin-booking-state";
import {
  appointmentHref,
  appointmentId,
  type AgendaAppointment,
} from "../../agenda-state";
import { loadAppointment, type Loaded } from "../../data";

export const metadata: Metadata = {
  title: "Cancelar agendamento — Administração — Augusto Barbearia",
};

const TITLE = "Cancelar agendamento";
const notFoundMessage = "Agendamento não encontrado.";

/**
 * Confirmação do cancelamento pela administração, sem prazo (RN-22, RN-31 a
 * RN-33). É uma página, e não um `<dialog>`, para funcionar sem JS. A API
 * confere o status de novo.
 */
export default async function CancelAdminAppointmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = appointmentId((await params).id);
  const loaded: Loaded<AgendaAppointment> =
    id === null ? { message: notFoundMessage } : await loadAppointment(id);

  if (id === null || !loaded.data) {
    return (
      <AdminStepFrame pageTitle="Agendamento" title={TITLE}>
        <Alert
          tone="danger"
          title={"message" in loaded ? loaded.message : notFoundMessage}
        />
      </AdminStepFrame>
    );
  }

  const appointment = loaded.data;
  const detail = appointmentHref(id, {
    data: localDate(appointment.starts_at),
    visao: "dia",
  });
  const back = (
    <ButtonLink
      href={detail}
      variant="ghost"
      size="sm"
      className="w-full sm:w-auto"
    >
      Voltar
    </ButtonLink>
  );

  return (
    <AdminStepFrame
      pageTitle="Agendamento"
      title={TITLE}
      summary={appointmentSummary(appointment)}
    >
      {appointment.status === "SCHEDULED" ? (
        <>
          <Alert tone="info" title="O horário fica livre na hora.">
            O cancelamento fica registrado como feito pela barbearia.
          </Alert>
          <AdminBookingForm
            action={cancelAdminAppointment}
            fields={{ appointment_id: id }}
            submitLabel="Cancelar agendamento"
            submitVariant="danger"
            secondary={back}
          />
        </>
      ) : (
        <>
          <Alert tone="warning" title={notActiveMessage} />
          <div>{back}</div>
        </>
      )}
    </AdminStepFrame>
  );
}
