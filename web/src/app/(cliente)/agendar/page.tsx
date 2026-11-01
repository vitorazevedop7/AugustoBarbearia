import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { DayPicker } from "@/components/booking/day-picker";
import { TimePicker } from "@/components/booking/time-picker";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { createApiClient } from "@/lib/api/client";
import {
  getAvailableDays,
  getAvailableSlots,
  getPublicBarbers,
  getPublicServices,
  type PublicBarber,
  type PublicService,
} from "@/lib/api/public";
import {
  bookingHref,
  bookingStep,
  parseBookingParams,
  withoutChoice,
  type BookingSelection,
  type BookingStep,
} from "@/lib/booking";
import {
  formatDuration,
  formatLongDate,
  formatPrice,
  formatTime,
} from "@/lib/format";
import { getCurrentSession } from "@/lib/session";
import { apiErrorMessage } from "../perfil/profile-state";
import {
  BookingHeader,
  BookingMain,
  ChoiceSummary,
  type SummaryItem,
} from "@/components/booking/booking-frame";
import { loadUnavailableMessage } from "./booking-state";
import { ConfirmBooking } from "./confirm-booking";
import { barbersFor, resolveSelection, servicesFor } from "./selection";
import { BarberStep, ServiceStep } from "@/components/booking/steps";

export const metadata: Metadata = {
  title: "Agendar — Augusto Barbearia",
  robots: { index: false },
};

/**
 * Agendamento pelo cliente (docs/specs/agendamento-cliente.md): uma escolha
 * por tela, na ordem barbeiro → serviço → dia → horário → confirmar (D11).
 * As escolhas ficam na URL e a primeira que falta é a etapa atual. As etapas
 * de escolha só leem rotas públicas; o login é pedido na confirmação.
 */
export default async function BookingPage({
  searchParams,
}: PageProps<"/agendar">) {
  const requested = parseBookingParams(await searchParams);
  const [barbers, services] = await Promise.all([
    getPublicBarbers(),
    getPublicServices(),
  ]);
  if (!barbers || !services) {
    return (
      <Unavailable
        step={bookingStep(requested)}
        message={loadUnavailableMessage}
      />
    );
  }

  const { selection, barber, service } = resolveSelection(
    requested,
    barbers,
    services,
  );
  const step = bookingStep(selection);
  const summary = summaryItems(selection, barber, service);

  if (step === "confirmar" && barber && service) {
    return confirmStep({
      selection: selection as Required<BookingSelection>,
      barber,
      service,
      summary,
    });
  }

  let content: ReactNode;
  if (step === "barbeiro") {
    content = (
      <BarberStep
        barbers={barbersFor(barbers, service)}
        hrefFor={({ id }) => bookingHref({ ...selection, barbeiro: id })}
      />
    );
  } else if (step === "servico" && barber) {
    content = (
      <ServiceStep
        services={servicesFor(services, barber)}
        barberName={barber.name}
        hrefFor={({ id }) => bookingHref({ ...selection, servico: id })}
      />
    );
  } else if (step === "data" && barber && service) {
    content = await dayStep(selection, barber, service);
  } else if (step === "hora" && barber && service && selection.data) {
    content = await timeStep(selection, barber, service, selection.data);
  }

  return (
    <BookingMain>
      <BookingHeader step={step} />
      <ChoiceSummary items={summary} />
      <div className="mt-10">{content}</div>
    </BookingMain>
  );
}

function Unavailable({
  step,
  message,
}: {
  step: BookingStep;
  message: string;
}) {
  return (
    <BookingMain>
      <BookingHeader step={step} />
      <div className="mt-10">
        <Alert tone="danger" title={message} />
      </div>
    </BookingMain>
  );
}

/** As escolhas já feitas, na ordem do fluxo, com o "Trocar" de cada uma. */
function summaryItems(
  selection: BookingSelection,
  barber: PublicBarber | undefined,
  service: PublicService | undefined,
): SummaryItem[] {
  const items: SummaryItem[] = [];
  if (barber) {
    items.push({
      label: "Barbeiro",
      value: barber.name,
      changeHref: bookingHref(withoutChoice(selection, "barbeiro")),
    });
  }
  if (service) {
    items.push({
      label: "Serviço",
      value: `${service.name} · ${formatDuration(service.duration_minutes)} · ${formatPrice(service.price)}`,
      changeHref: bookingHref(withoutChoice(selection, "servico")),
    });
  }
  if (selection.data) {
    items.push({
      label: "Dia",
      value: formatLongDate(selection.data),
      changeHref: bookingHref(withoutChoice(selection, "data")),
    });
  }
  return items;
}

async function dayStep(
  selection: BookingSelection,
  barber: PublicBarber,
  service: PublicService,
) {
  const days = await getAvailableDays(barber.id, service.id);
  if (days === null)
    return <Alert tone="danger" title={loadUnavailableMessage} />;
  if (days.length === 0) {
    return (
      <EmptyState
        title="Nenhum dia com horário livre"
        description={`${barber.name} não tem horário livre para este serviço nos próximos dias. Escolha outro barbeiro ou outro serviço.`}
        action={
          <ButtonLink href={bookingHref()} variant="outline">
            Escolher outro barbeiro
          </ButtonLink>
        }
      />
    );
  }
  return (
    <DayPicker
      days={days}
      hrefFor={(date) => bookingHref({ ...selection, data: date })}
    />
  );
}

async function timeStep(
  selection: BookingSelection,
  barber: PublicBarber,
  service: PublicService,
  date: string,
) {
  const slots = await getAvailableSlots(barber.id, service.id, date);
  if (slots === null)
    return <Alert tone="danger" title={loadUnavailableMessage} />;
  if (slots.length === 0) {
    return (
      <EmptyState
        title="Não há horários livres neste dia"
        description="Os horários podem ter acabado de ser reservados. Escolha outro dia."
        action={
          <ButtonLink
            href={bookingHref(withoutChoice(selection, "data"))}
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
      slots={slots}
      hrefFor={(slot) =>
        bookingHref({ ...selection, hora: formatTime(slot.starts_at) })
      }
    />
  );
}

/**
 * Etapa 5. Exige login aqui, e não antes: o visitante vê os horários livres e
 * entra com o Google ao escolher um, voltando para esta mesma URL.
 */
async function confirmStep({
  selection,
  barber,
  service,
  summary,
}: {
  selection: Required<BookingSelection>;
  barber: PublicBarber;
  service: PublicService;
  summary: SummaryItem[];
}) {
  const here = bookingHref(selection);
  if (!(await getCurrentSession())) {
    redirect(`/entrar?voltar=${encodeURIComponent(here)}`);
  }

  let me;
  try {
    me = await createApiClient().GET("/me", {
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    return <Unavailable step="confirmar" message={loadUnavailableMessage} />;
  }
  if (!me.data) {
    // 401 com sessão válida (ex.: JWKS indisponível) fica aqui, sem ciclo de login.
    const message =
      me.response.status === 401 ? undefined : apiErrorMessage(me.error);
    return (
      <Unavailable
        step="confirmar"
        message={message || loadUnavailableMessage}
      />
    );
  }
  // RN-70: a administração não agenda para si.
  if (me.data.role !== "customer") redirect("/admin");

  const slots = await getAvailableSlots(barber.id, service.id, selection.data);
  if (slots === null) {
    return <Unavailable step="confirmar" message={loadUnavailableMessage} />;
  }
  const slot =
    slots.find(({ starts_at }) => formatTime(starts_at) === selection.hora) ??
    null;
  const time = slot
    ? `${formatTime(slot.starts_at)} às ${formatTime(slot.ends_at)}`
    : selection.hora;

  return (
    <BookingMain>
      <ConfirmBooking
        summary={[
          ...summary,
          {
            label: "Horário",
            value: time,
            changeHref: bookingHref(withoutChoice(selection, "hora")),
          },
        ]}
        slot={slot}
        barberId={barber.id}
        serviceId={service.id}
        needsPhone={!me.data.has_phone}
        changeTimeHref={bookingHref(withoutChoice(selection, "hora"))}
        backHref={here}
      />
    </BookingMain>
  );
}
