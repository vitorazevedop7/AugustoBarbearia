"use client";

import { useActionState, useMemo } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { toPriceInput } from "@/lib/format";
import type { FormState } from "../../form-state";
import { createService, updateService } from "./actions";
import {
  BARBER_FIELD_PREFIX,
  type Barber,
  SERVICES_PATH,
  type Service,
} from "./form-data";

const initialState: FormState = { status: "idle" };

/**
 * Cadastro (sem `service`) ou edição de um serviço, com a escolha dos barbeiros
 * que o realizam (RN-61). Funciona sem JS.
 */
export function ServiceForm({
  service,
  barbers,
}: {
  service?: Service;
  barbers: Barber[];
}) {
  const serviceId = service?.id;
  const save = useMemo(
    () =>
      serviceId === undefined
        ? createService
        : updateService.bind(null, serviceId),
    [serviceId],
  );
  const [state, action, pending] = useActionState(save, initialState);

  const stored = {
    name: service?.name ?? "",
    description: service?.description ?? "",
    price: toPriceInput(service?.price),
    duration_minutes: service ? String(service.duration_minutes) : "",
    situacao: service?.active === false ? "inativo" : "ativo",
  };
  // Depois de um erro, o formulário volta com o que foi digitado, e não com o salvo.
  const value = (field: keyof typeof stored) =>
    state.values?.[field] ?? stored[field];
  const storedBarbers = new Set(service?.barbers.map((barber) => barber.id));
  // A caixa desmarcada não vai no envio: com `values`, só vale o que voltou nele.
  const isChecked = (barberId: number) =>
    state.values
      ? `${BARBER_FIELD_PREFIX}${barberId}` in state.values
      : storedBarbers.has(barberId);

  return (
    <form action={action} className="flex max-w-2xl flex-col gap-6">
      {state.status === "error" ? (
        <Alert
          tone="danger"
          revealOnMount="center"
          title={state.message ?? ""}
        />
      ) : null}
      <TextField
        name="name"
        label="Nome"
        maxLength={80}
        autoComplete="off"
        defaultValue={value("name")}
      />
      <TextAreaField
        name="description"
        label="Descrição"
        optional
        rows={3}
        maxLength={400}
        hint="Até 400 caracteres."
        defaultValue={value("description")}
      />
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField
          name="price"
          label="Preço"
          inputMode="decimal"
          autoComplete="off"
          className="tabular-nums"
          hint="Em reais, como 25,00 ou 1.000,00."
          defaultValue={value("price")}
        />
        <TextField
          name="duration_minutes"
          label="Duração"
          type="number"
          inputMode="numeric"
          min={10}
          step={5}
          className="tabular-nums"
          hint="Em minutos: múltiplo de 5, no mínimo 10."
          defaultValue={value("duration_minutes")}
        />
      </div>
      <fieldset aria-describedby="barbeiros-hint" className="flex flex-col">
        <legend className="mb-2 text-sm font-semibold text-ink">
          Quem realiza
        </legend>
        {barbers.map((barber) => (
          <Checkbox
            key={barber.id}
            name={`${BARBER_FIELD_PREFIX}${barber.id}`}
            label={barber.active ? barber.name : `${barber.name} (inativo)`}
            defaultChecked={isChecked(barber.id)}
          />
        ))}
        <p id="barbeiros-hint" className="mt-2 text-sm text-ink-muted">
          Escolha pelo menos um barbeiro. O inativo não recebe agendamentos
          enquanto estiver inativo.
        </p>
      </fieldset>
      {service ? (
        <SelectField
          name="situacao"
          label="Situação"
          hint="O serviço inativo some da vitrine e não recebe agendamentos novos."
          defaultValue={value("situacao")}
        >
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
        </SelectField>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Button
          type="submit"
          size="sm"
          pending={pending}
          className="w-full sm:w-auto"
        >
          Salvar serviço
        </Button>
        <ButtonLink href={SERVICES_PATH} variant="ghost" size="sm">
          Voltar para a lista
        </ButtonLink>
      </div>
    </form>
  );
}
