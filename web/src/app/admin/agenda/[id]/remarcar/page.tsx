import type { Metadata } from "next";
import type { ReactNode } from "react";
import type { SummaryItem } from "@/components/booking/booking-frame";
import { DayPicker } from "@/components/booking/day-picker";
import { BarberStep } from "@/components/booking/steps";
import { TimePicker } from "@/components/booking/time-picker";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TextField } from "@/components/ui/field";
import {
  getPublicBarbers,
  getPublicServices,
  type PublicBarber,
} from "@/lib/api/public";
import {
  formatLongDate,
  formatShortDate,
  formatTime,
  localDate,
} from "@/lib/format";
import {
  parseRescheduleParams,
  RESCHEDULE_STEPS,
  rescheduleStep,
  withoutRescheduleChoice,
  type RescheduleSelection,
  type RescheduleStep,
} from "@/app/(cliente)/meus-agendamentos/appointments-state";
import { rescheduleAdminAppointment } from "../../admin-booking-actions";
import {
  loadAdminRescheduleDays,
  loadAdminRescheduleSlots,
} from "../../admin-booking-data";
import { AdminBookingForm } from "../../admin-booking-form";
import { AdminStepFrame } from "../../admin-booking-frame";
import {
  adminRescheduleHref,
  notActiveMessage,
  stepProgress,
} from "../../admin-booking-state";
import {
  appointmentHref,
  appointmentId,
  type AgendaAppointment,
} from "../../agenda-state";
import { loadAppointment, type Loaded } from "../../data";

export const metadata: Metadata = {
  title: "Remarcar agendamento — Administração — Augusto Barbearia",
};

const PAGE_TITLE = "Remarcar agendamento";
const notFoundMessage = "Agendamento não encontrado.";
const barbersUnavailableMessage =
  "Não foi possível carregar os barbeiros. Tente novamente em instantes.";

/**
 * Remarcação pela administração, sem prazo (RN-15, RN-22): barbeiro → dia →
 * horário → confirmação, com o `DayPicker` e o `TimePicker` do agendamento.
 * O serviço, o preço e a duração não mudam. Os dias e horários vêm das rotas
 * da administração, que ignoram o próprio agendamento (RN-21).
 */
export default async function RescheduleAdminAppointmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const id = appointmentId((await params).id);
  const requested = parseRescheduleParams(await searchParams);
  const loaded: Loaded<AgendaAppointment> =
    id === null ? { message: notFoundMessage } : await loadAppointment(id);

  if (id === null || !loaded.data) {
    return (
      <AdminStepFrame pageTitle={PAGE_TITLE} title={PAGE_TITLE}>
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
  const fixed: SummaryItem[] = [
    {
      label: "Atual",
      value: `${formatShortDate(localDate(appointment.starts_at))} · ${formatTime(appointment.starts_at)} · ${appointment.barber.name}`,
    },
    { label: "Cliente", value: appointment.customer.name },
    { label: "Serviço", value: appointment.service.name },
  ];

  if (appointment.status !== "SCHEDULED") {
    return (
      <AdminStepFrame pageTitle={PAGE_TITLE} title={PAGE_TITLE} summary={fixed}>
        <Alert tone="warning" title={notActiveMessage} />
        <div>{back}</div>
      </AdminStepFrame>
    );
  }

  const [barbers, services] = await Promise.all([
    getPublicBarbers(),
    getPublicServices(),
  ]);
  if (!barbers || !services) {
    return (
      <AdminStepFrame pageTitle={PAGE_TITLE} title={PAGE_TITLE} summary={fixed}>
        <Alert tone="danger" title={barbersUnavailableMessage} />
        <div>{back}</div>
      </AdminStepFrame>
    );
  }

  // Os barbeiros ativos que realizam o serviço (RN-05, item 5, e RN-61).
  const offered = services.find(
    ({ id: serviceId }) => serviceId === appointment.service.id,
  );
  const performers = offered
    ? barbers.filter(({ id: barberId }) =>
        offered.barbers.some(({ id: performer }) => performer === barberId),
      )
    : [];
  const barber = performers.find(
    ({ id: barberId }) => barberId === requested.barbeiro,
  );
  const selection: RescheduleSelection = {};
  if (barber) {
    selection.barbeiro = barber.id;
    if (requested.data) selection.data = requested.data;
    if (requested.hora) selection.hora = requested.hora;
  }
  const step = rescheduleStep(selection);
  const href = (choice: RescheduleSelection) => adminRescheduleHref(id, choice);
  const summary: SummaryItem[] = [...fixed];
  if (barber) {
    summary.push({
      label: "Barbeiro",
      value: barber.name,
      changeHref: href(withoutRescheduleChoice(selection, "barbeiro")),
    });
  }
  if (selection.data) {
    summary.push({
      label: "Dia",
      value: formatLongDate(selection.data),
      changeHref: href(withoutRescheduleChoice(selection, "data")),
    });
  }

  let content: ReactNode;
  if (step === "barbeiro" || !barber) {
    content =
      performers.length === 0 ? (
        <EmptyState
          title="Nenhum barbeiro disponível"
          description="Nenhum barbeiro ativo realiza este serviço. O agendamento pode ser cancelado."
        />
      ) : (
        <BarberStep
          barbers={performers}
          hrefFor={({ id: barberId }) => href({ barbeiro: barberId })}
        />
      );
  } else if (step === "data") {
    content = await dayStep(id, selection, barber);
  } else if (step === "hora" && selection.data) {
    content = await timeStep(id, selection, barber, selection.data);
  } else {
    return confirmStep({ appointment, selection, barber, summary, back });
  }

  return (
    <Frame step={step} summary={summary}>
      {content}
      <div>{back}</div>
    </Frame>
  );
}

function Frame({
  step,
  summary,
  children,
}: {
  step: RescheduleStep;
  summary: SummaryItem[];
  children: ReactNode;
}) {
  const progress = stepProgress(RESCHEDULE_STEPS, step);
  return (
    <AdminStepFrame
      pageTitle={PAGE_TITLE}
      progress={progress}
      title={progress.title}
      summary={summary}
    >
      {children}
    </AdminStepFrame>
  );
}

async function dayStep(
  id: number,
  selection: RescheduleSelection,
  barber: PublicBarber,
) {
  const days = await loadAdminRescheduleDays(id, barber.id);
  const otherDate = (
    <form
      method="get"
      action={adminRescheduleHref(id)}
      className="flex items-end gap-3"
    >
      <input type="hidden" name="barbeiro" value={barber.id} />
      <div className="w-44">
        <TextField type="date" name="data" label="Outra data" required />
      </div>
      <Button type="submit" variant="outline" size="sm" className="min-h-12">
        Ir
      </Button>
    </form>
  );
  if (!days.data) {
    return (
      <>
        <Alert tone="danger" title={days.message} />
        {otherDate}
      </>
    );
  }
  return (
    <>
      {days.data.length === 0 ? (
        <EmptyState
          title="Nenhum dia com horário livre"
          description={`${barber.name} não tem horário livre para este serviço nos próximos 30 dias. Escolha outra data ou outro barbeiro.`}
        />
      ) : (
        <DayPicker
          days={days.data}
          headingLevel="h3"
          hrefFor={(date) =>
            adminRescheduleHref(id, { ...selection, data: date })
          }
        />
      )}
      {otherDate}
    </>
  );
}

async function timeStep(
  id: number,
  selection: RescheduleSelection,
  barber: PublicBarber,
  date: string,
) {
  const slots = await loadAdminRescheduleSlots(id, barber.id, date);
  if (!slots.data) return <Alert tone="danger" title={slots.message} />;
  if (slots.data.length === 0) {
    return (
      <EmptyState
        title="Não há horários livres neste dia"
        description="O dia pode estar fechado, ocupado ou já ter passado. Escolha outro dia."
        action={
          <ButtonLink
            href={adminRescheduleHref(
              id,
              withoutRescheduleChoice(selection, "data"),
            )}
            variant="outline"
            size="sm"
          >
            Escolher outro dia
          </ButtonLink>
        }
      />
    );
  }
  return (
    <TimePicker
      slots={slots.data}
      headingLevel="h3"
      hrefFor={(slot) =>
        adminRescheduleHref(id, {
          ...selection,
          hora: formatTime(slot.starts_at),
        })
      }
    />
  );
}

/** Etapa 4: o horário atual e o novo, e "Confirmar remarcação". */
async function confirmStep({
  appointment,
  selection,
  barber,
  summary,
  back,
}: {
  appointment: AgendaAppointment;
  selection: RescheduleSelection;
  barber: PublicBarber;
  summary: SummaryItem[];
  back: ReactNode;
}) {
  const id = appointment.id;
  const changeTimeHref = adminRescheduleHref(
    id,
    withoutRescheduleChoice(selection, "hora"),
  );
  const slots = await loadAdminRescheduleSlots(
    id,
    barber.id,
    selection.data ?? "",
  );
  const slot = slots.data?.find(
    ({ starts_at }) => formatTime(starts_at) === selection.hora,
  );
  const items: SummaryItem[] = [
    ...summary,
    {
      label: "Horário",
      value: slot
        ? `${formatTime(slot.starts_at)} às ${formatTime(slot.ends_at)}`
        : (selection.hora ?? ""),
      changeHref: changeTimeHref,
    },
  ];

  let content: ReactNode;
  if (!slots.data) {
    content = <Alert tone="danger" title={slots.message} />;
  } else if (!slot) {
    content = (
      <>
        <Alert tone="warning" title="Este horário não está mais disponível.">
          Alguém pode ter acabado de reservá-lo. Escolha outro horário.
        </Alert>
        <div>
          <ButtonLink href={changeTimeHref} size="sm">
            Escolher outro horário
          </ButtonLink>
        </div>
      </>
    );
  } else {
    content = (
      <>
        <Alert tone="info" title="O serviço e o valor continuam os mesmos.">
          O horário atual fica livre na hora.
        </Alert>
        <AdminBookingForm
          action={rescheduleAdminAppointment}
          fields={{
            appointment_id: id,
            starts_at: slot.starts_at,
            barber_id: barber.id,
          }}
          submitLabel="Confirmar remarcação"
          secondary={back}
          retry={{ href: changeTimeHref, label: "Escolher outro horário" }}
        />
      </>
    );
  }

  return (
    <Frame step="confirmar" summary={items}>
      {content}
    </Frame>
  );
}
