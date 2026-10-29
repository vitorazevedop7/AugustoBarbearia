import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BookingMain,
  ChoiceSummary,
  StepHeader,
} from "@/components/booking/booking-frame";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { getPublicShop } from "@/lib/api/public";
import { cancelAppointment } from "../../actions";
import { appointmentSummary, ChangeUnavailable } from "../../appointment-card";
import {
  appointmentId,
  cancelHref,
  loadUnavailableMessage,
  MY_APPOINTMENTS_PATH,
} from "../../appointments-state";
import { ChangeForm } from "../../change-form";
import { loadMyAppointment, requireSession } from "../../data";

export const metadata: Metadata = {
  title: "Cancelar agendamento — Augusto Barbearia",
  robots: { index: false },
};

const TITLE = "Cancelar agendamento";

/**
 * Confirmação do cancelamento (RN-14, RN-31 a RN-33). É uma página, e não um
 * `<dialog>`, para funcionar sem JS. Quem decide se ainda pode é a API
 * (`can_cancel`); a Server Action confere tudo de novo.
 */
export default async function CancelAppointmentPage({
  params,
}: PageProps<"/meus-agendamentos/[id]/cancelar">) {
  const id = appointmentId((await params).id);
  if (id === null) notFound();
  await requireSession(cancelHref(id));
  const [loaded, shop] = await Promise.all([
    loadMyAppointment(id),
    getPublicShop(),
  ]);
  const back = (
    <ButtonLink
      href={MY_APPOINTMENTS_PATH}
      variant="ghost"
      className="w-full sm:w-auto"
    >
      Voltar
    </ButtonLink>
  );

  if (!loaded.data) {
    return (
      <BookingMain>
        <StepHeader title={TITLE} />
        <div className="mt-6 flex flex-col gap-6">
          <Alert
            tone="danger"
            title={loaded.message || loadUnavailableMessage}
          />
          <div>{back}</div>
        </div>
      </BookingMain>
    );
  }

  const appointment = loaded.data;
  return (
    <BookingMain>
      <StepHeader title={TITLE} />
      <ChoiceSummary items={appointmentSummary(appointment)} />
      <div className="mt-6 flex flex-col gap-6">
        {appointment.can_cancel ? (
          <>
            <Alert
              tone="info"
              title="O horário fica livre para outros clientes."
            >
              Para voltar a ter um horário, você precisa agendar de novo.
            </Alert>
            <ChangeForm
              action={cancelAppointment}
              fields={{ appointment_id: id, voltar: cancelHref(id) }}
              shop={shop}
              submitLabel="Cancelar agendamento"
              submitVariant="danger"
              secondary={back}
            />
          </>
        ) : (
          <>
            <ChangeUnavailable appointment={appointment} shop={shop} />
            <div>{back}</div>
          </>
        )}
      </div>
    </BookingMain>
  );
}
