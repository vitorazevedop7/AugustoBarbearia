"use client";

import { type ReactNode, useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { FormState } from "../../form-state";
import { deleteTimeBlock } from "./actions";

const initialState: FormState = { status: "idle" };

/**
 * A confirmação de "Remover bloqueio": o `ghost` "Voltar" vem antes do
 * `danger` no Tab (design system, "Confirmação destrutiva"). Funciona sem JS.
 */
export function RemoveTimeBlockForm({
  fields,
  back,
}: {
  /** O id do bloqueio e a agenda para onde voltar. */
  fields: Record<string, string>;
  back: ReactNode;
}) {
  const [state, action, pending] = useActionState(
    deleteTimeBlock,
    initialState,
  );
  return (
    <form action={action} className="flex flex-col gap-6">
      {state.status === "error" ? (
        <Alert
          tone="danger"
          revealOnMount="center"
          title={state.message ?? ""}
        />
      ) : null}
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {back}
        <Button
          type="submit"
          variant="danger"
          size="sm"
          pending={pending}
          className="w-full sm:w-auto"
        >
          Remover bloqueio
        </Button>
      </div>
    </form>
  );
}
