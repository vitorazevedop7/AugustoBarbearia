"use client";

import Link from "next/link";
import { type ReactNode, useActionState } from "react";
import { CustomerFields } from "@/components/admin/customer-fields";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  SLOT_UNAVAILABLE_CODE,
  type AdminBookingState,
} from "./admin-booking-state";

const textLink =
  "font-semibold text-brand underline underline-offset-4 transition-colors duration-300 ease-standard hover:text-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none";

/**
 * Formulário das ações da administração sobre um agendamento: criar,
 * remarcar e cancelar. Campos ocultos, o erro da API e os botões, e, para o
 * cliente novo, os campos do `CustomerFields` (RN-20). Funciona sem JS
 * (Server Action com `useActionState`); o sucesso vai para o detalhe.
 */
export function AdminBookingForm({
  action,
  fields,
  newCustomer = false,
  submitLabel,
  submitVariant = "primary",
  secondary,
  retry,
}: {
  action: (
    state: AdminBookingState,
    formData: FormData,
  ) => Promise<AdminBookingState>;
  /** Os campos ocultos do pedido (ids e início). */
  fields: Record<string, string | number>;
  /** Mostra nome, telefone e e-mail para cadastrar o cliente na hora. */
  newCustomer?: boolean;
  submitLabel: string;
  submitVariant?: "primary" | "danger";
  /** O link ao lado do botão ("Voltar"). Vem antes dele na ordem do Tab. */
  secondary: ReactNode;
  /** Quando o horário foi tomado, o link para escolher outro. */
  retry?: { href: string; label: string };
}) {
  const [state, formAction, pending] = useActionState(action, {
    status: "idle",
  });
  const values = state.values ?? {};

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-6">
      {state.status === "error" ? (
        <Alert tone="danger" title={state.message ?? ""}>
          {retry && state.code === SLOT_UNAVAILABLE_CODE ? (
            <Link href={retry.href} className={textLink}>
              {retry.label}
            </Link>
          ) : null}
        </Alert>
      ) : null}
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {newCustomer ? (
        <fieldset className="flex flex-col gap-6">
          <legend className="mb-4 font-semibold text-ink">Cliente novo</legend>
          <CustomerFields
            values={{
              name: values.name ?? "",
              phone: values.phone ?? "",
              email: values.email ?? "",
            }}
          />
        </fieldset>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {secondary}
        <Button
          type="submit"
          size="sm"
          variant={submitVariant}
          pending={pending}
          className="w-full sm:w-auto"
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
