"use client";

import Link from "next/link";
import { type ReactNode, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ContactNotice } from "@/components/booking/contact-notice";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { ShopContact } from "@/lib/contact";
import { DEADLINE_CODE, type ChangeState } from "./appointments-state";

const textLink =
  "font-semibold text-brand underline underline-offset-4 transition-colors duration-300 ease-out hover:text-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none";

/**
 * Formulário de cancelar ou remarcar: campos ocultos, o erro da API e os
 * botões. Funciona sem JS (Server Action com `useActionState`). O sucesso
 * redireciona para a lista com o aviso. A recusa do prazo (RN-14) mostra o
 * contato da barbearia junto do `message` da API.
 */
export function ChangeForm({
  action,
  fields,
  shop,
  submitLabel,
  submitVariant = "primary",
  secondary,
  retry,
}: {
  action: (state: ChangeState, formData: FormData) => Promise<ChangeState>;
  /** Os campos ocultos do pedido (id, início, barbeiro, `voltar`). */
  fields: Record<string, string | number>;
  shop: ShopContact | null;
  submitLabel: string;
  submitVariant?: "primary" | "danger";
  /** O link ao lado do botão ("Voltar"). Vem antes dele na ordem do Tab. */
  secondary: ReactNode;
  /** Na remarcação, o link para escolher outro horário depois de uma recusa. */
  retry?: { href: string; label: string };
}) {
  const [state, formAction] = useActionState(action, { status: "idle" });
  const failed = state.status === "error" && state.message;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {failed && state.code === DEADLINE_CODE ? (
        <ContactNotice shop={shop} title={state.message} />
      ) : failed ? (
        <Alert tone="danger" title={state.message ?? ""}>
          {retry ? (
            <Link href={retry.href} className={textLink}>
              {retry.label}
            </Link>
          ) : null}
        </Alert>
      ) : null}
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {secondary}
        <SubmitButton label={submitLabel} variant={submitVariant} />
      </div>
    </form>
  );
}

function SubmitButton({
  label,
  variant,
}: {
  label: string;
  variant: "primary" | "danger";
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      pending={pending}
      className="w-full sm:w-auto"
    >
      {label}
    </Button>
  );
}
