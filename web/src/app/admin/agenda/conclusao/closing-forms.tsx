"use client";

import { useActionState, useMemo } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ChoiceChip } from "@/components/ui/choice-chip";
import { TextField } from "@/components/ui/field";
import { toPriceInput } from "@/lib/format";
import type { FormState } from "../../form-state";
import type { AgendaState } from "../agenda-state";
import { completeAppointment, correctPayment, markNoShow } from "./actions";
import {
  METHOD_LABELS,
  PAYMENT_METHODS,
  type PaymentMethod,
} from "./closing-state";

const initialState: FormState = { status: "idle" };

function ErrorAlert({ state }: { state: FormState }) {
  return state.status === "error" ? (
    <Alert tone="danger" revealOnMount="center" title={state.message ?? ""} />
  ) : null;
}

/**
 * Valor cobrado e forma de pagamento (RN-40). As formas são botões grandes de
 * escolha única (um `radio` de verdade, que funciona sem JS), e nenhuma vem
 * marcada na conclusão: um toque errado viraria dado errado no financeiro.
 */
function PaymentFields({
  amount,
  method,
  hint,
}: {
  amount: string;
  method?: PaymentMethod;
  hint: string;
}) {
  return (
    <>
      <TextField
        label="Valor cobrado (R$)"
        name="amount"
        inputMode="decimal"
        autoComplete="off"
        defaultValue={amount}
        hint={hint}
      />
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold text-ink">
          Forma de pagamento
        </legend>
        <div className="mt-1 grid grid-cols-2 gap-3">
          {PAYMENT_METHODS.map((option) => (
            <ChoiceChip
              key={option}
              name="method"
              value={option}
              label={METHOD_LABELS[option]}
              defaultChecked={option === method}
              required
              className="min-h-14 w-full text-base"
            />
          ))}
        </div>
      </fieldset>
    </>
  );
}

/**
 * Concluir o atendimento (RN-31, RN-40). O valor já vem com o preço do
 * agendamento (RN-13); mudar é desconto, e zero é cortesia. Depois de um erro,
 * a tela volta com o que foi digitado.
 */
export function CompleteForm({
  id,
  agenda,
  price,
}: {
  id: number;
  agenda: AgendaState;
  price: string;
}) {
  const complete = useMemo(
    () => completeAppointment.bind(null, id, agenda),
    [id, agenda],
  );
  const [state, action, pending] = useActionState(complete, initialState);
  const method = PAYMENT_METHODS.find(
    (option) => option === state.values?.method,
  );

  return (
    <form action={action} className="flex flex-col gap-5">
      <ErrorAlert state={state} />
      <PaymentFields
        amount={state.values?.amount ?? toPriceInput(price)}
        method={method}
        hint="Já vem com o preço do serviço. Mude para dar desconto; 0 é cortesia."
      />
      <Button
        type="submit"
        size="sm"
        pending={pending}
        className="w-full sm:w-auto"
      >
        Concluir atendimento
      </Button>
    </form>
  );
}

/**
 * Marcar a falta (RN-31). É definitivo, então abre uma confirmação antes
 * (`details`, sem JS).
 */
export function NoShowForm({
  id,
  agenda,
}: {
  id: number;
  agenda: AgendaState;
}) {
  const noShow = useMemo(() => markNoShow.bind(null, id, agenda), [id, agenda]);
  const [state, action, pending] = useActionState(noShow, initialState);

  return (
    <details
      open={state.status === "error" || undefined}
      className="flex flex-col gap-4"
    >
      <summary className="inline-flex min-h-11 w-full cursor-pointer list-none items-center justify-center border-2 border-danger px-5 py-2.5 text-center font-heading text-sm leading-5 font-black text-danger uppercase hover:bg-danger hover:text-surface focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-danger sm:w-auto [&::-webkit-details-marker]:hidden">
        Marcar falta
      </summary>
      <form action={action} className="mt-4 flex flex-col gap-4">
        <ErrorAlert state={state} />
        <p className="text-sm text-ink-muted">
          O cliente não compareceu? Isso não pode ser desfeito.
        </p>
        <Button
          type="submit"
          size="sm"
          variant="danger"
          pending={pending}
          className="w-full sm:w-auto"
        >
          Confirmar falta
        </Button>
      </form>
    </details>
  );
}

/** Corrigir o valor e a forma de um atendimento concluído (RN-41). */
export function CorrectPaymentForm({
  id,
  agenda,
  amount,
  method,
}: {
  id: number;
  agenda: AgendaState;
  amount: string;
  method: PaymentMethod;
}) {
  const correct = useMemo(
    () => correctPayment.bind(null, id, agenda),
    [id, agenda],
  );
  const [state, action, pending] = useActionState(correct, initialState);
  const chosen = PAYMENT_METHODS.find(
    (option) => option === (state.values?.method ?? method),
  );

  return (
    <details
      open={state.status === "error" || undefined}
      className="flex flex-col gap-4"
    >
      <summary className="inline-flex min-h-11 w-full cursor-pointer list-none items-center justify-center border-2 border-ink px-5 py-2.5 text-center font-heading text-sm leading-5 font-black text-ink uppercase hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink sm:w-auto [&::-webkit-details-marker]:hidden">
        Corrigir
      </summary>
      <form action={action} className="mt-4 flex flex-col gap-5">
        <ErrorAlert state={state} />
        <PaymentFields
          amount={state.values?.amount ?? toPriceInput(amount)}
          method={chosen}
          hint="Corrige só o pagamento. O atendimento continua concluído."
        />
        <Button
          type="submit"
          size="sm"
          pending={pending}
          className="w-full sm:w-auto"
        >
          Salvar correção
        </Button>
      </form>
    </details>
  );
}
