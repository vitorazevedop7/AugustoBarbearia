import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import type { SummaryItem } from "@/components/booking/booking-frame";
import { DayPicker } from "@/components/booking/day-picker";
import { BarberStep, ServiceStep } from "@/components/booking/steps";
import { TimePicker } from "@/components/booking/time-picker";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TextField } from "@/components/ui/field";
import {
  getPublicBarbers,
  getPublicServices,
  type PublicBarber,
  type PublicService,
} from "@/lib/api/public";
import {
  formatLongDate,
  formatPhone,
  formatPrice,
  formatTime,
} from "@/lib/format";
import { createAdminAppointment } from "../admin-booking-actions";
import {
  loadAdminDays,
  loadAdminSlots,
  loadCustomer,
  searchCustomers,
} from "../admin-booking-data";
import { AdminBookingForm } from "../admin-booking-form";
import { AdminStepFrame } from "../admin-booking-frame";
import {
  NEW_APPOINTMENT_PATH,
  NEW_APPOINTMENT_STEPS,
  newAppointmentHref,
  newAppointmentStep,
  parseCustomerQuery,
  parseNewAppointmentParams,
  slotsUnavailableMessage,
  stepProgress,
  withoutNewChoice,
  type NewAppointmentSelection,
  type NewAppointmentStep,
} from "../admin-booking-state";
import { AGENDA_PATH } from "../agenda-state";

export const metadata: Metadata = {
  title: "Novo agendamento — Administração — Augusto Barbearia",
};

const PAGE_TITLE = "Novo agendamento";

const catalogUnavailableMessage =
  "Não foi possível carregar os barbeiros e os serviços. Tente novamente em instantes.";

const textLink =
  "font-semibold text-brand underline underline-offset-4 transition-colors duration-300 ease-standard hover:text-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none";

/**
 * Agendamento pela administração (RN-20, RN-21): barbeiro → serviço → dia →
 * horário → cliente → confirmação, uma escolha por tela e o estado na URL.
 * Os dias e horários vêm das rotas da administração, sem antecedência nem
 * janela; o cliente é um já cadastrado ou um novo, gravado junto com o
 * agendamento.
 */
export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const requested = parseNewAppointmentParams(params);
  const query = parseCustomerQuery(params.q);
  const [barbers, services] = await Promise.all([
    getPublicBarbers(),
    getPublicServices(),
  ]);

  if (!barbers || !services) {
    return (
      <Frame step="barbeiro">
        <Alert tone="danger" title={catalogUnavailableMessage} />
      </Frame>
    );
  }

  // Só valem as escolhas que existem na vitrine e dependem das anteriores.
  const barber = barbers.find(({ id }) => id === requested.barbeiro);
  const offered = barber
    ? services.filter((item) => item.barbers.some(({ id }) => id === barber.id))
    : [];
  const service = offered.find(({ id }) => id === requested.servico);
  const selection: NewAppointmentSelection = {};
  if (barber) selection.barbeiro = barber.id;
  if (barber && service) {
    selection.servico = service.id;
    if (requested.data) selection.data = requested.data;
    if (requested.hora) selection.hora = requested.hora;
    if (requested.cliente !== undefined) selection.cliente = requested.cliente;
  }
  const step = newAppointmentStep(selection);
  const summary = choices(selection, barber, service);

  let content: ReactNode;
  if (step === "barbeiro" || !barber) {
    content = (
      <BarberStep
        barbers={barbers}
        hrefFor={({ id }) => newAppointmentHref({ barbeiro: id })}
      />
    );
  } else if (step === "servico" || !service) {
    content =
      offered.length === 0 ? (
        <EmptyState
          title={`${barber.name} não tem serviços disponíveis`}
          description="Escolha outro barbeiro para continuar."
          action={
            <ButtonLink href={NEW_APPOINTMENT_PATH} variant="outline" size="sm">
              Escolher outro barbeiro
            </ButtonLink>
          }
        />
      ) : (
        <ServiceStep
          services={offered}
          barberName={barber.name}
          hrefFor={({ id }) =>
            newAppointmentHref({ barbeiro: barber.id, servico: id })
          }
        />
      );
  } else if (step === "data") {
    content = await dayStep(selection, barber, service);
  } else if (step === "hora" && selection.data) {
    content = await timeStep(selection, barber, service, selection.data);
  } else if (step === "cliente") {
    content = await customerStep(selection, query);
  } else {
    return confirmStep(selection, barber, service, summary);
  }

  return (
    <Frame step={step} summary={summary}>
      {content}
    </Frame>
  );
}

function Frame({
  step,
  summary,
  children,
}: {
  step: NewAppointmentStep;
  summary?: SummaryItem[];
  children: ReactNode;
}) {
  const progress = stepProgress(NEW_APPOINTMENT_STEPS, step);
  return (
    <AdminStepFrame
      pageTitle={PAGE_TITLE}
      progress={progress}
      title={progress.title}
      summary={summary}
    >
      {children}
      <div>
        <ButtonLink
          href={AGENDA_PATH}
          variant="ghost"
          size="sm"
          className="px-0"
        >
          Voltar para a agenda
        </ButtonLink>
      </div>
    </AdminStepFrame>
  );
}

/** As escolhas feitas, cada uma com o "Trocar" para a etapa dela. */
function choices(
  selection: NewAppointmentSelection,
  barber: PublicBarber | undefined,
  service: PublicService | undefined,
): SummaryItem[] {
  const items: SummaryItem[] = [];
  const change = (field: Parameters<typeof withoutNewChoice>[1]) =>
    newAppointmentHref(withoutNewChoice(selection, field));
  if (barber) {
    items.push({
      label: "Barbeiro",
      value: barber.name,
      changeHref: change("barbeiro"),
    });
  }
  if (service) {
    items.push({
      label: "Serviço",
      value: `${service.name} · ${formatPrice(service.price)}`,
      changeHref: change("servico"),
    });
  }
  if (selection.data) {
    items.push({
      label: "Dia",
      value: formatLongDate(selection.data),
      changeHref: change("data"),
    });
  }
  if (selection.hora) {
    items.push({
      label: "Horário",
      value: selection.hora,
      changeHref: change("hora"),
    });
  }
  return items;
}

/** Etapa 3: os dias com horário e "Outra data", para ir além da lista (RN-21). */
async function dayStep(
  selection: NewAppointmentSelection,
  barber: PublicBarber,
  service: PublicService,
) {
  const days = await loadAdminDays(barber.id, service.id);
  const otherDate = (
    <form
      method="get"
      action={NEW_APPOINTMENT_PATH}
      className="flex items-end gap-3"
    >
      <input type="hidden" name="barbeiro" value={barber.id} />
      <input type="hidden" name="servico" value={service.id} />
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
          hrefFor={(date) => newAppointmentHref({ ...selection, data: date })}
        />
      )}
      {otherDate}
    </>
  );
}

/** Etapa 4: os horários livres do dia, inclusive o encaixe de agora (RN-21). */
async function timeStep(
  selection: NewAppointmentSelection,
  barber: PublicBarber,
  service: PublicService,
  date: string,
) {
  const slots = await loadAdminSlots(barber.id, service.id, date);
  if (!slots.data) return <Alert tone="danger" title={slots.message} />;
  if (slots.data.length === 0) {
    return (
      <EmptyState
        title="Não há horários livres neste dia"
        description="O dia pode estar fechado, ocupado ou já ter passado. Escolha outro dia."
        action={
          <ButtonLink
            href={newAppointmentHref(withoutNewChoice(selection, "data"))}
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
        newAppointmentHref({ ...selection, hora: formatTime(slot.starts_at) })
      }
    />
  );
}

/** Etapa 5: buscar um cliente cadastrado ou cadastrar um novo (RN-20). */
async function customerStep(selection: NewAppointmentSelection, query: string) {
  const newCustomer = (
    <ButtonLink
      href={newAppointmentHref({ ...selection, cliente: "novo" })}
      variant="outline"
      size="sm"
      className="w-full sm:w-auto"
    >
      Cadastrar cliente novo
    </ButtonLink>
  );
  const found = query ? await searchCustomers(query) : undefined;

  return (
    <>
      <form
        method="get"
        action={NEW_APPOINTMENT_PATH}
        role="search"
        className="flex items-end gap-3"
      >
        {Object.entries(selection).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={String(value)} />
        ))}
        <div className="min-w-0 flex-1">
          <TextField
            type="search"
            name="q"
            label="Buscar por nome, telefone ou e-mail"
            maxLength={100}
            autoComplete="off"
            defaultValue={query}
            required
          />
        </div>
        <Button type="submit" variant="outline" size="sm" className="min-h-12">
          Buscar
        </Button>
      </form>
      {found && !found.data ? (
        <Alert tone="danger" title={found.message} />
      ) : null}
      {found?.data && found.data.items.length === 0 ? (
        <p className="text-ink-muted">Nenhum cliente encontrado.</p>
      ) : null}
      {found?.data && found.data.items.length > 0 ? (
        <section aria-labelledby="clientes-encontrados">
          <h3
            id="clientes-encontrados"
            className="text-xs font-semibold tracking-[0.08em] text-ink-muted uppercase"
          >
            Clientes encontrados
          </h3>
          <ul className="mt-3 divide-y divide-line bg-surface shadow-card">
            {found.data.items.map((customer) => (
              <li key={customer.id}>
                <Link
                  href={newAppointmentHref({
                    ...selection,
                    cliente: customer.id,
                  })}
                  className="flex min-h-11 flex-col gap-0.5 px-4 py-3 transition-colors duration-300 ease-standard hover:bg-paper focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none sm:px-6"
                >
                  <span className="font-semibold text-ink wrap-anywhere">
                    {customer.name}
                  </span>
                  <span className="text-sm text-ink-muted tabular-nums wrap-anywhere">
                    {[
                      customer.phone ? formatPhone(customer.phone) : null,
                      customer.email,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Sem contato"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {found.data.total > found.data.items.length ? (
            <p className="mt-3 text-sm text-ink-muted">
              Mostrando {found.data.items.length} de {found.data.total}{" "}
              clientes. Refine a busca para achar o seu.
            </p>
          ) : null}
        </section>
      ) : null}
      <div>{newCustomer}</div>
    </>
  );
}

/** Etapa 6: o resumo, o cliente e "Confirmar agendamento". */
async function confirmStep(
  selection: NewAppointmentSelection,
  barber: PublicBarber,
  service: PublicService,
  summary: SummaryItem[],
) {
  const changeTimeHref = newAppointmentHref(
    withoutNewChoice(selection, "hora"),
  );
  const changeCustomerHref = newAppointmentHref(
    withoutNewChoice(selection, "cliente"),
  );
  const date = selection.data ?? "";
  const [slots, customer] = await Promise.all([
    loadAdminSlots(barber.id, service.id, date),
    typeof selection.cliente === "number"
      ? loadCustomer(selection.cliente)
      : undefined,
  ]);
  const slot = slots.data?.find(
    ({ starts_at }) => formatTime(starts_at) === selection.hora,
  );
  const items: SummaryItem[] = summary.map((item) =>
    item.label === "Horário" && slot
      ? {
          ...item,
          value: `${formatTime(slot.starts_at)} às ${formatTime(slot.ends_at)}`,
        }
      : item,
  );
  if (customer?.data) {
    items.push({
      label: "Cliente",
      value: (
        <span className="flex flex-col">
          <span className="wrap-anywhere">{customer.data.name}</span>
          {customer.data.phone ? (
            <span className="text-sm text-ink-muted tabular-nums">
              {formatPhone(customer.data.phone)}
            </span>
          ) : null}
        </span>
      ),
      changeHref: changeCustomerHref,
    });
  } else if (selection.cliente === "novo") {
    items.push({
      label: "Cliente",
      value: "Cliente novo",
      changeHref: changeCustomerHref,
    });
  }

  let content: ReactNode;
  if (!slots.data) {
    content = (
      <Alert tone="danger" title={slots.message || slotsUnavailableMessage} />
    );
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
  } else if (customer && !customer.data) {
    content = (
      <Alert tone="danger" title={customer.message}>
        <Link href={changeCustomerHref} className={textLink}>
          Escolher outro cliente
        </Link>
      </Alert>
    );
  } else {
    content = (
      <AdminBookingForm
        action={createAdminAppointment}
        fields={{
          barber_id: barber.id,
          service_id: service.id,
          starts_at: slot.starts_at,
          ...(typeof selection.cliente === "number"
            ? { customer_id: selection.cliente }
            : {}),
        }}
        newCustomer={selection.cliente === "novo"}
        submitLabel="Confirmar agendamento"
        secondary={
          <ButtonLink
            href={AGENDA_PATH}
            variant="ghost"
            size="sm"
            className="w-full sm:w-auto"
          >
            Voltar para a agenda
          </ButtonLink>
        }
        retry={{ href: changeTimeHref, label: "Escolher outro horário" }}
      />
    );
  }

  const progress = stepProgress(NEW_APPOINTMENT_STEPS, "confirmar");
  return (
    <AdminStepFrame
      pageTitle={PAGE_TITLE}
      progress={progress}
      title={progress.title}
      summary={items}
    >
      {content}
    </AdminStepFrame>
  );
}
