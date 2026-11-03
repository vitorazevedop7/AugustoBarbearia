"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { confirmBooking } from "./actions";
import {
  BookingHeader,
  ChoiceSummary,
  type SummaryItem,
} from "@/components/booking/booking-frame";
import { MY_APPOINTMENTS_PATH, type ConfirmState } from "./booking-state";

const textLink =
  "font-semibold text-brand underline underline-offset-4 transition-colors duration-300 ease-standard hover:text-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none";

/**
 * Etapa 5: o resumo, a política de alteração (RN-14) e o botão de confirmar. Sem
 * telefone no perfil, pede o telefone antes (RN-10). Depois de confirmar, a
 * Server Action leva à página do horário confirmado. Sem JS, ela continua
 * funcionando.
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
  return (
    <>
      <BookingHeader step="confirmar" />
      <ChoiceSummary items={summary} />
      {slot ? (
        <form action={formAction} className="mt-10 flex flex-col gap-6">
          {state.status === "error" && state.message ? (
            <Alert tone="danger" revealOnMount="center" title={state.message}>
              {state.code === "SLOT_UNAVAILABLE" ? (
                <Link href={changeTimeHref} className={textLink}>
                  Escolher outro horário
                </Link>
              ) : state.code === "APPOINTMENT_LIMIT_REACHED" ? (
                // RN-11: o caminho é cancelar um dos horários marcados.
                <Link href={MY_APPOINTMENTS_PATH} className={textLink}>
                  Ver meus agendamentos
                </Link>
              ) : null}
            </Alert>
          ) : null}
          <Alert tone="info" title="Imprevistos acontecem.">
            Você pode remarcar ou cancelar pelo site até o horário marcado. Se
            puder, avise com pelo menos 2 horas de antecedência: assim outro
            cliente aproveita o horário.
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
        <div className="mt-10 flex flex-col gap-6">
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
