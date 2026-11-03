"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import {
  formatLongDate,
  formatTime,
  localDate,
  toTimeInput,
} from "@/lib/format";
import { saveBusinessHours } from "./actions";
import {
  type BusinessHoursDay,
  type BusinessHoursFormState,
  type ConflictingAppointment,
  WEEKDAYS,
} from "./form-data";

const initialState: BusinessHoursFormState = { status: "idle" };

const textLink =
  "font-semibold text-brand underline underline-offset-4 transition-colors duration-300 ease-standard hover:text-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none";

/**
 * Os agendamentos que impedem a mudança (RN-02, #124), cada um com o link
 * para o detalhe da agenda, onde a administração remarca ou cancela.
 */
function Conflicts({
  appointments,
  total,
}: {
  appointments: ConflictingAppointment[];
  total: number;
}) {
  const hidden = total - appointments.length;
  return (
    <>
      <ul className="mt-2 flex flex-col gap-1">
        {appointments.map((item) => (
          <li key={item.id}>
            <Link
              href={`/admin/agenda/${item.id}`}
              className={`${textLink} inline-flex min-h-11 items-center`}
            >
              {formatLongDate(localDate(item.starts_at))},{" "}
              {formatTime(item.starts_at)} às {formatTime(item.ends_at)}
            </Link>{" "}
            · {item.barber_name} · {item.customer_name}
          </li>
        ))}
      </ul>
      {hidden > 0 ? (
        <p className="mt-2">
          {hidden === 1
            ? "E mais 1 agendamento depois desses."
            : `E mais ${hidden} agendamentos depois desses.`}
        </p>
      ) : null}
    </>
  );
}

export function BusinessHoursForm({ days }: { days: BusinessHoursDay[] }) {
  const [state, action, pending] = useActionState(
    saveBusinessHours,
    initialState,
  );

  return (
    <form action={action} className="flex max-w-2xl flex-col gap-6">
      {state.status === "error" ? (
        <Alert tone="danger" title={state.message ?? ""}>
          {state.conflicts ? <Conflicts {...state.conflicts} /> : null}
        </Alert>
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
