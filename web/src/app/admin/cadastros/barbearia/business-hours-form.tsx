"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import { toTimeInput } from "@/lib/format";
import { saveBusinessHours } from "./actions";
import type { FormState } from "../../form-state";
import { type BusinessHoursDay, WEEKDAYS } from "./form-data";

const initialState: FormState = { status: "idle" };

export function BusinessHoursForm({ days }: { days: BusinessHoursDay[] }) {
  const [state, action, pending] = useActionState(
    saveBusinessHours,
    initialState,
  );

  return (
    <form action={action} className="flex max-w-2xl flex-col gap-6">
      {state.status === "error" ? (
        <Alert tone="danger" title={state.message ?? ""} />
      ) : null}
      {state.status === "success" ? (
        <Alert tone="success" title={state.message ?? ""} />
      ) : null}
      <p className="text-sm text-ink-muted">
        Vale para todos os barbeiros. Os horários oferecidos começam na abertura
        e seguem de 30 em 30 minutos. Num dia fechado, as horas são ignoradas.
      </p>
      {WEEKDAYS.map((name, weekday) => {
        const day = days.find((item) => item.weekday === weekday);
        const prefix = `dia-${weekday}`;
        const stored = {
          situacao: day?.opens_at ? "aberto" : "fechado",
          abertura: toTimeInput(day?.opens_at),
          fechamento: toTimeInput(day?.closes_at),
        };
        const value = (field: keyof typeof stored) =>
          state.values?.[`${prefix}-${field}`] ?? stored[field];
        return (
          <fieldset
            key={weekday}
            className="grid gap-4 bg-surface p-6 shadow-card sm:grid-cols-3"
          >
            <legend className="float-left mb-2 w-full font-semibold text-ink sm:col-span-3">
              {name}
            </legend>
            <SelectField
              id={`${prefix}-situacao`}
              name={`${prefix}-situacao`}
              label="Situação"
              defaultValue={value("situacao")}
            >
              <option value="aberto">Aberto</option>
              <option value="fechado">Fechado</option>
            </SelectField>
            <TextField
              id={`${prefix}-abertura`}
              name={`${prefix}-abertura`}
              label="Abertura"
              type="time"
              step={300}
              required={false}
              className="tabular-nums"
              defaultValue={value("abertura")}
            />
            <TextField
              id={`${prefix}-fechamento`}
              name={`${prefix}-fechamento`}
              label="Fechamento"
              type="time"
              step={300}
              required={false}
              className="tabular-nums"
              defaultValue={value("fechamento")}
            />
          </fieldset>
        );
      })}
      <div>
        <Button
          type="submit"
          size="sm"
          pending={pending}
          className="w-full sm:w-auto"
        >
          Salvar horário
        </Button>
      </div>
    </form>
  );
}
