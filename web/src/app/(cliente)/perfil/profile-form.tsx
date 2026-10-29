"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { saveProfile } from "./actions";
import type { ProfileFormValues } from "./profile-state";

/** Formulário do perfil. Sem JS, a Server Action continua salvando. */
export function ProfileForm({
  email,
  initialValues,
}: {
  email: string | null;
  initialValues: ProfileFormValues;
}) {
  const [state, formAction] = useActionState(saveProfile, {
    status: "idle",
    values: initialValues,
  });

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.status === "error" && state.message ? (
        <Alert tone="danger" title={state.message} />
      ) : null}
      {state.status === "success" && state.message ? (
        <Alert tone="success" title={state.message} />
      ) : null}
      <TextField
        label="Nome"
        name="name"
        autoComplete="name"
        maxLength={120}
        defaultValue={state.values.name}
      />
      {email ? (
        <TextField
          label="E-mail"
          name="email"
          type="email"
          hint="Vem da sua conta Google e não pode ser alterado aqui."
          readOnly
          value={email}
        />
      ) : null}
      <TextField
        label="Telefone"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        maxLength={30}
        hint="Com DDD. Exemplo: (11) 98765-4321."
        defaultValue={state.values.phone}
      />
      <SubmitButton />
    </form>
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
      Salvar
    </Button>
  );
}
