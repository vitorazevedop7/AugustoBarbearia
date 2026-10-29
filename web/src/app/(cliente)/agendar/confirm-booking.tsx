"use client";

import Link from "next/link";
import { type Ref, useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import {
  formatDuration,
  formatLongDate,
  formatPrice,
  formatTime,
  localDate,
} from "@/lib/format";
import { confirmBooking } from "./actions";
import {
  BookingHeader,
  ChoiceSummary,
  type SummaryItem,
} from "./booking-frame";
import {
  MY_APPOINTMENTS_PATH,
  type BookedAppointment,
  type ConfirmState,
} from "./booking-state";

const textLink =
  "font-semibold text-brand underline underline-offset-4 transition-colors duration-300 ease-out hover:text-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none";

/**
 * Etapa 5: o resumo, o aviso das 2 horas (RN-14) e o botão de confirmar. Sem
 * telefone no perfil, pede o telefone antes (RN-10). Depois de confirmar, a
 * mesma página mostra o resumo do agendamento criado. Sem JS, a Server Action
 * continua funcionando.
 */
export function ConfirmBooking({
  summary,
  slot,
  barberId,
  serviceId,
  needsPhone,
  changeTimeHref,
  backHref,
}: {
  summary: SummaryItem[];
  /** O horário escolhido, como a API o devolveu; `null` se já não está livre. */
  slot: { starts_at: string; ends_at: string } | null;
  barberId: number;
  serviceId: number;
  needsPhone: boolean;
  changeTimeHref: string;
  /** Esta confirmação, para voltar a ela depois do login. */
  backHref: string;
}) {
  const [state, formAction] = useActionState<ConfirmState, FormData>(
    confirmBooking,
    { status: "idle", phone: "" },
  );
  const headingRef = useRef<HTMLHeadingElement>(null);
  const success = state.status === "success" ? state.appointment : undefined;

  useEffect(() => {
    if (success) headingRef.current?.focus();
  }, [success]);

  if (success)
    return <Confirmed appointment={success} headingRef={headingRef} />;

  return (
    <>
      <BookingHeader step="confirmar" />
      <ChoiceSummary items={summary} />
      {slot ? (
        <form action={formAction} className="mt-6 flex flex-col gap-6">
          {state.status === "error" && state.message ? (
            <Alert tone="danger" title={state.message}>
              <Link href={changeTimeHref} className={textLink}>
                Escolher outro horário
              </Link>
            </Alert>
          ) : null}
          <Alert
            tone="info"
            title="Você pode cancelar ou remarcar até 2 horas antes do horário."
          >
            Depois disso, fale com a barbearia.
          </Alert>
          <input type="hidden" name="barber_id" value={barberId} />
          <input type="hidden" name="service_id" value={serviceId} />
          <input type="hidden" name="starts_at" value={slot.starts_at} />
          <input type="hidden" name="voltar" value={backHref} />
          {needsPhone ? (
            <TextField
              label="Telefone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              maxLength={30}
              hint="Com DDD. Exemplo: (11) 98765-4321. A barbearia usa o telefone para falar com você, e ele fica salvo no seu perfil."
              defaultValue={state.phone}
            />
          ) : null}
          <SubmitButton />
        </form>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          <Alert tone="warning" title="Este horário não está mais disponível.">
            Alguém pode ter acabado de reservá-lo. Escolha outro horário.
          </Alert>
          <ButtonLink
            href={changeTimeHref}
            className="w-full sm:w-auto sm:self-start"
          >
            Escolher outro horário
          </ButtonLink>
        </div>
      )}
    </>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      pending={pending}
      className="w-full sm:w-auto sm:self-start"
    >
      Confirmar agendamento
    </Button>
  );
}

/** O agendamento criado, com o link para "Meus agendamentos" (S3.09). */
function Confirmed({
  appointment,
  headingRef,
}: {
  appointment: BookedAppointment;
  headingRef: Ref<HTMLHeadingElement>;
}) {
  const date = formatLongDate(localDate(appointment.starts_at));
  const start = formatTime(appointment.starts_at);
  return (
    <>
      <BookingHeader title="Horário confirmado" headingRef={headingRef} />
      <div className="mt-6">
        <Alert
          tone="success"
          title={`Seu horário está confirmado para ${date}, às ${start}.`}
        />
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
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href={MY_APPOINTMENTS_PATH}>
          Ver meus agendamentos
        </ButtonLink>
        <ButtonLink href="/" variant="ghost">
          Voltar para o início
        </ButtonLink>
      </div>
    </>
  );
}
