"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SelectField, TextField } from "@/components/ui/field";
import type { FormState } from "../../form-state";
import { createTimeBlock } from "./actions";

const initialState: FormState = { status: "idle" };

type BarberOption = { id: number; name: string };

/**
 * Novo bloqueio (RN-03): barbeiro, data, "Dia inteiro" ou início e fim, e o
 * motivo. Funciona sem JS: com "Dia inteiro" marcado, a Server Action não
 * envia os horários, e quem decide o resto é a API.
 */
export function TimeBlockForm({
  barbers,
  defaults,
  hidden,
  backHref,
}: {
  barbers: BarberOption[];
  defaults: { barberId?: number; date: string };
  /** A agenda de onde veio, para voltar para ela depois de salvar. */
  hidden: Record<string, string>;
  backHref: string;
}) {
  const [state, action, pending] = useActionState(
    createTimeBlock,
    initialState,
  );
  const values = state.values;
  const barberId = values?.barber_id ?? String(defaults.barberId ?? "");

  return (
    <form action={action} className="flex max-w-2xl flex-col gap-6">
      {state.status === "error" ? (
        <Alert
          tone="danger"
          revealOnMount="center"
          title={state.message ?? ""}
        />
      ) : null}
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <SelectField
        name="barber_id"
        label="Barbeiro"
        defaultValue={barberId}
        key={`barber-${barberId}`}
      >
        <option value="" disabled>
          Escolha o barbeiro
        </option>
        {barbers.map((barber) => (
          <option key={barber.id} value={barber.id}>
            {barber.name}
          </option>
        ))}
      </SelectField>
      <div className="w-full sm:w-56">
        <TextField
          type="date"
          name="date"
          label="Data"
          defaultValue={values?.date ?? defaults.date}
          key={`date-${values?.date ?? defaults.date}`}
        />
      </div>
      <fieldset className="flex flex-col gap-4">
        <legend className="text-sm font-semibold text-ink">Horário</legend>
        <div className="flex flex-col gap-1">
          <Checkbox
            name="all_day"
            value="1"
            label="Dia inteiro"
            defaultChecked={values?.all_day === "1"}
            key={`all-day-${values?.all_day ?? ""}`}
            aria-describedby="all_day-hint"
          />
          <p id="all_day-hint" className="text-sm text-ink-muted">
            Folga: o barbeiro não atende no dia. Com o dia inteiro marcado, o
            início e o fim são ignorados.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:max-w-sm">
          <TextField
            type="time"
            name="start_time"
            label="Início"
            required={false}
            defaultValue={values?.start_time ?? ""}
            key={`start-${values?.start_time ?? ""}`}
          />
          <TextField
            type="time"
            name="end_time"
            label="Fim"
            required={false}
            defaultValue={values?.end_time ?? ""}
            key={`end-${values?.end_time ?? ""}`}
          />
        </div>
      </fieldset>
      <TextField
        name="reason"
        label="Motivo"
        optional
        maxLength={120}
        hint="Ex.: almoço, folga, compromisso."
        defaultValue={values?.reason ?? ""}
        key={`reason-${values?.reason ?? ""}`}
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Button
          type="submit"
          size="sm"
          pending={pending}
          className="w-full sm:w-auto"
        >
          Bloquear horário
        </Button>
        <ButtonLink href={backHref} variant="ghost" size="sm">
          Voltar para a agenda
        </ButtonLink>
      </div>
    </form>
  );
}
