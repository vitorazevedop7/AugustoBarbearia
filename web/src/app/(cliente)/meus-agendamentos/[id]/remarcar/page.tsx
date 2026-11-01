import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  BookingMain,
  ChoiceSummary,
  StepHeader,
  type SummaryItem,
} from "@/components/booking/booking-frame";
import { DayPicker } from "@/components/booking/day-picker";
import { BarberStep } from "@/components/booking/steps";
import { TimePicker } from "@/components/booking/time-picker";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getPublicBarbers,
  getPublicServices,
  getPublicShop,
  type PublicBarber,
} from "@/lib/api/public";
import {
  formatLongDate,
  formatShortDate,
  formatTime,
  localDate,
} from "@/lib/format";
import { rescheduleAppointment } from "../../actions";
import { ChangeUnavailable } from "../../appointment-card";
import {
  appointmentId,
  loadUnavailableMessage,
  MY_APPOINTMENTS_PATH,
  parseRescheduleParams,
  RESCHEDULE_STEPS,
  rescheduleHref,
  rescheduleStep,
  slotsUnavailableMessage,
  withoutRescheduleChoice,
  type MyAppointment,
  type RescheduleSelection,
  type RescheduleStep,
} from "../../appointments-state";
import { ChangeForm } from "../../change-form";
import {
  loadMyAppointment,
  loadRescheduleDays,
  loadRescheduleSlots,
  requireSession,
} from "../../data";

export const metadata: Metadata = {
  title: "Remarcar agendamento — Augusto Barbearia",
  robots: { index: false },
};

/**
 * Remarcação (RN-15): barbeiro → dia → horário → confirmar, com as telas de
 * dia e horário do `/agendar`. As escolhas ficam na URL e a primeira que
 * falta é a etapa. O serviço, o preço e a duração não mudam. Os dias e
 * horários vêm das rotas da remarcação, que ignoram o próprio agendamento.
 */
export default async function RescheduleAppointmentPage({
  params,
  searchParams,
}: PageProps<"/meus-agendamentos/[id]/remarcar">) {
  const id = appointmentId((await params).id);
  if (id === null) notFound();
  const requested = parseRescheduleParams(await searchParams);
  await requireSession(rescheduleHref(id, requested));
  const [loaded, shop, barbers, services] = await Promise.all([
    loadMyAppointment(id),
    getPublicShop(),
    getPublicBarbers(),
    getPublicServices(),
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
      <Frame>
        <Alert tone="danger" title={loaded.message || loadUnavailableMessage} />
        <div>{back}</div>
      </Frame>
    );
  }
  const appointment = loaded.data;
  const current: SummaryItem = {
    label: "Atual",
    value: `${formatShortDate(localDate(appointment.starts_at))} · ${formatTime(appointment.starts_at)} · ${appointment.barber.name}`,
  };
  const service: SummaryItem = {
    label: "Serviço",
    value: appointment.service.name,
  };

  if (!appointment.can_reschedule) {
    return (
      <Frame summary={[current, service]}>
        <ChangeUnavailable appointment={appointment} shop={shop} />
        <div>{back}</div>
      </Frame>
    );
  }
  if (!barbers || !services) {
    return (
      <Frame summary={[current, service]}>
        <Alert tone="danger" title={slotsUnavailableMessage} />
      </Frame>
    );
  }

  // Os barbeiros da vitrine que realizam o serviço (RN-05, item 5, e RN-61).
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
    if (requested.data) {
      selection.data = requested.data;
      if (requested.hora) selection.hora = requested.hora;
    }
  }
  const step = rescheduleStep(selection);
  const href = (choice: RescheduleSelection) => rescheduleHref(id, choice);
  const summary: SummaryItem[] = [current, service];
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
  if (step === "barbeiro") {
    content = (
      <BarberStep
        barbers={performers}
        hrefFor={({ id: barberId }) => href({ barbeiro: barberId })}
      />
    );
  } else if (step === "data" && barber) {
    content = await dayStep(id, selection, barber);
  } else if (step === "hora" && barber && selection.data) {
    content = await timeStep(id, selection, barber, selection.data);
  } else if (barber && selection.data && selection.hora) {
    return confirmStep({
      appointment,
      selection,
      barber,
      date: selection.data,
      time: selection.hora,
      summary,
      shop,
      back,
    });
  }

  return (
    <Frame step={step} summary={summary}>
      {content}
    </Frame>
  );
}

function Frame({
  step,
  summary = [],
  children,
}: {
  step?: RescheduleStep;
  summary?: SummaryItem[];
  children: ReactNode;
}) {
  const index = RESCHEDULE_STEPS.findIndex((item) => item.step === step);
  const current = RESCHEDULE_STEPS[index];
  return (
    <BookingMain>
      <StepHeader
        progress={
          current
            ? {
                number: index + 1,
                total: RESCHEDULE_STEPS.length,
                label: current.label,
              }
            : undefined
        }
        title={current?.title ?? "Remarcar agendamento"}
      />
      <ChoiceSummary items={summary} />
      <div className="mt-10 flex flex-col gap-6">{children}</div>
    </BookingMain>
  );
}

async function dayStep(
  id: number,
  selection: RescheduleSelection,
  barber: PublicBarber,
) {
  const days = await loadRescheduleDays(id, barber.id);
  if (!days.data) {
    return (
      <Alert tone="danger" title={days.message || slotsUnavailableMessage} />
    );
  }
  if (days.data.length === 0) {
    return (
      <EmptyState
        title="Nenhum dia com horário livre"
        description={`${barber.name} não tem outro horário livre para este serviço nos próximos dias. Escolha outro barbeiro.`}
        action={
          <ButtonLink href={rescheduleHref(id)} variant="outline">
            Escolher outro barbeiro
          </ButtonLink>
        }
      />
    );
  }
  return (
    <DayPicker
      days={days.data}
      hrefFor={(date) => rescheduleHref(id, { ...selection, data: date })}
    />
  );
}

async function timeStep(
  id: number,
  selection: RescheduleSelection,
  barber: PublicBarber,
  date: string,
) {
  const slots = await loadRescheduleSlots(id, barber.id, date);
  if (!slots.data) {
    return (
      <Alert tone="danger" title={slots.message || slotsUnavailableMessage} />
    );
  }
  if (slots.data.length === 0) {
    return (
      <EmptyState
        title="Não há horários livres neste dia"
        description="Os horários podem ter acabado de ser reservados. Escolha outro dia."
        action={
          <ButtonLink
            href={rescheduleHref(
              id,
              withoutRescheduleChoice(selection, "data"),
            )}
            variant="outline"
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
      hrefFor={(slot) =>
        rescheduleHref(id, { ...selection, hora: formatTime(slot.starts_at) })
      }
    />
  );
}

/** Etapa 4: o horário atual e o novo, e o botão de confirmar. */
async function confirmStep({
  appointment,
  selection,
  barber,
  date,
  time,
  summary,
  shop,
  back,
}: {
  appointment: MyAppointment;
  selection: RescheduleSelection;
  barber: PublicBarber;
  date: string;
  time: string;
  summary: SummaryItem[];
  shop: Awaited<ReturnType<typeof getPublicShop>>;
  back: ReactNode;
}) {
  const id = appointment.id;
  const changeTimeHref = rescheduleHref(
    id,
    withoutRescheduleChoice(selection, "hora"),
  );
  const slots = await loadRescheduleSlots(id, barber.id, date);
  if (!slots.data) {
    return (
      <Frame step="confirmar" summary={summary}>
        <Alert tone="danger" title={slots.message || slotsUnavailableMessage} />
      </Frame>
    );
  }
  const slot = slots.data.find(
    ({ starts_at }) => formatTime(starts_at) === time,
  );
  const items: SummaryItem[] = [
    ...summary,
    {
      label: "Horário",
      value: slot
        ? `${formatTime(slot.starts_at)} às ${formatTime(slot.ends_at)}`
        : time,
      changeHref: changeTimeHref,
    },
  ];

  return (
    <Frame step="confirmar" summary={items}>
      {slot ? (
        <>
          <Alert tone="info" title="O serviço e o valor continuam os mesmos.">
            O horário atual fica livre para outros clientes.
          </Alert>
          <ChangeForm
            action={rescheduleAppointment}
            fields={{
              appointment_id: id,
              starts_at: slot.starts_at,
              barber_id: barber.id,
              voltar: rescheduleHref(id, selection),
            }}
            shop={shop}
            submitLabel="Confirmar remarcação"
            secondary={back}
            retry={{ href: changeTimeHref, label: "Escolher outro horário" }}
          />
        </>
      ) : (
        <>
          <Alert tone="warning" title="Este horário não está mais disponível.">
            Alguém pode ter acabado de reservá-lo. Escolha outro horário.
          </Alert>
          <ButtonLink
            href={changeTimeHref}
            className="w-full sm:w-auto sm:self-start"
          >
            Escolher outro horário
          </ButtonLink>
        </>
      )}
    </Frame>
  );
}
