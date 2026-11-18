import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BookingHeader,
  BookingMain,
  ChoiceSummary,
} from "@/components/booking/booking-frame";
import { CalendarLink } from "@/components/booking/calendar-link";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import {
  formatDuration,
  formatLongDate,
  formatPrice,
  formatTime,
  localDate,
} from "@/lib/format";
import { appointmentId } from "../../../meus-agendamentos/appointments-state";
import {
  loadMyAppointment,
  requireSession,
} from "../../../meus-agendamentos/data";
import { confirmedHref, MY_APPOINTMENTS_PATH } from "../../booking-state";

export const metadata: Metadata = {
  title: "Horário confirmado — Augusto Barbearia",
  robots: { index: false },
};

// Cancelado, concluído, inexistente ou de outro cliente: o título não promete
// o horário (#190).
const INACTIVE_TITLE = "Seu agendamento";

/**
 * O agendamento criado, numa URL própria (#155): recarregar a página mostra
 * o mesmo horário, sem pedir a confirmação de novo nem falar em "alguém" que
 * reservou o horário, que foi do próprio cliente. Lê `GET /me/appointments/{id}`
 * (RN-16: o de outro cliente responde como inexistente).
 */
export default async function ConfirmedPage({
  params,
}: PageProps<"/agendar/confirmado/[id]">) {
  const id = appointmentId((await params).id);
  if (id === null) notFound();
  await requireSession(confirmedHref(id));
  const loaded = await loadMyAppointment(id);
  const links = (
    <div className="mt-10 flex flex-col gap-3 sm:flex-row">
      <ButtonLink href={MY_APPOINTMENTS_PATH}>Ver meus agendamentos</ButtonLink>
      {loaded.data?.status === "SCHEDULED" ? (
        <CalendarLink appointmentId={loaded.data.id} size="md" />
      ) : null}
      <ButtonLink href="/" variant="ghost">
        Voltar para o início
      </ButtonLink>
    </div>
  );

  if (!loaded.data) {
    return (
      <BookingMain>
        <BookingHeader title={INACTIVE_TITLE} />
        <div className="mt-8">
          <Alert
            tone="danger"
            title={
              loaded.message ||
              "Não foi possível carregar o agendamento. Tente novamente em instantes."
            }
          />
        </div>
        {links}
      </BookingMain>
    );
  }

  const appointment = loaded.data;
  const date = formatLongDate(localDate(appointment.starts_at));
  const start = formatTime(appointment.starts_at);
  const scheduled = appointment.status === "SCHEDULED";
  return (
    <BookingMain>
      <BookingHeader
        title={scheduled ? "Horário confirmado" : INACTIVE_TITLE}
      />
      <div className="mt-8">
        {scheduled ? (
          <Alert
            tone="success"
            title={`Seu horário está confirmado para ${date}, às ${start}.`}
          />
        ) : (
          // Cancelado depois, ou já concluído: a página não promete o horário.
          <Alert tone="info" title="Este agendamento não está mais ativo." />
        )}
      </div>
      <ChoiceSummary
        items={[
          { label: "Barbeiro", value: appointment.barber.name },
          {
            label: "Serviço",
            value: `${appointment.service.name} · ${formatDuration(appointment.duration_minutes)}`,
          },
          { label: "Dia", value: date },
          {
            label: "Horário",
            value: `${start} às ${formatTime(appointment.ends_at)}`,
          },
          { label: "Valor", value: formatPrice(appointment.price) },
        ]}
      />
      {links}
    </BookingMain>
  );
}
