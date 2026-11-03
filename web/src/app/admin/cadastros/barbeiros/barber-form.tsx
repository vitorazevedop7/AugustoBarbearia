"use client";

import { useActionState, useMemo } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { SelectField, TextAreaField, TextField } from "@/components/ui/field";
import type { FormState } from "../../form-state";
import { createBarber, updateBarber } from "./actions";
import { BARBERS_PATH, type Barber } from "./form-data";

const initialState: FormState = { status: "idle" };

/** Cadastro (sem `barber`) ou edição de um barbeiro. Funciona sem JS. */
export function BarberForm({ barber }: { barber?: Barber }) {
  const barberId = barber?.id;
  const save = useMemo(
    () =>
      barberId === undefined ? createBarber : updateBarber.bind(null, barberId),
    [barberId],
  );
  const [state, action, pending] = useActionState(save, initialState);

  const stored = {
    name: barber?.name ?? "",
    photo_path: barber?.photo_path ?? "",
    bio: barber?.bio ?? "",
    situacao: barber?.active === false ? "inativo" : "ativo",
  };
  // Depois de um erro, o formulário volta com o que foi digitado, e não com o salvo.
  const value = (field: keyof typeof stored) =>
    state.values?.[field] ?? stored[field];

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
      <TextField
        name="photo_path"
        label="Foto"
        optional
        autoCapitalize="none"
        autoComplete="off"
        spellCheck={false}
        hint="Caminho de uma foto do site, como /images/barbeiros/edvaldo.jpg. O envio de arquivo chega depois."
        defaultValue={value("photo_path")}
      />
      <TextAreaField
        name="bio"
        label="Apresentação"
        optional
        maxLength={400}
        hint="Até 400 caracteres."
        defaultValue={value("bio")}
      />
      {barber ? (
        <SelectField
          name="situacao"
          label="Situação"
          hint="O barbeiro inativo some da vitrine e não recebe agendamentos novos."
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
          Salvar barbeiro
        </Button>
        <ButtonLink href={BARBERS_PATH} variant="ghost" size="sm">
          Voltar para a lista
        </ButtonLink>
      </div>
    </form>
  );
}
