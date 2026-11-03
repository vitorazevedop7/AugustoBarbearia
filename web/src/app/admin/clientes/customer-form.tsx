"use client";

import { useActionState, useMemo } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { CustomerFields } from "@/components/admin/customer-fields";
import { formatPhone } from "@/lib/format";
import type { FormState } from "../form-state";
import { createCustomer, updateCustomer } from "./actions";
import { CUSTOMERS_PATH, type Customer } from "./form-data";

const initialState: FormState = { status: "idle" };

/** Cadastro (sem `customer`) ou edição de um cliente. Funciona sem JS. */
export function CustomerForm({ customer }: { customer?: Customer }) {
  const customerId = customer?.id;
  const save = useMemo(
    () =>
      customerId === undefined
        ? createCustomer
        : updateCustomer.bind(null, customerId),
    [customerId],
  );
  const [state, action, pending] = useActionState(save, initialState);

  const stored = {
    name: customer?.name ?? "",
    phone: customer?.phone ? formatPhone(customer.phone) : "",
    email: customer?.email ?? "",
  };
  // Depois de um erro, o formulário volta com o que foi digitado, e não com o salvo.
  const values = {
    name: state.values?.name ?? stored.name,
    phone: state.values?.phone ?? stored.phone,
    email: state.values?.email ?? stored.email,
  };

  return (
    <form action={action} className="flex max-w-2xl flex-col gap-6">
      {state.status === "error" ? (
        <Alert
          tone="danger"
          revealOnMount="center"
          title={state.message ?? ""}
        />
      ) : null}
      <CustomerFields
        values={values}
        emailLocked={customer?.has_account === true}
        phoneOptional={customer !== undefined && !customer.phone}
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Button
          type="submit"
          size="sm"
          pending={pending}
          className="w-full sm:w-auto"
        >
          Salvar cliente
        </Button>
        <ButtonLink href={CUSTOMERS_PATH} variant="ghost" size="sm">
          Voltar para a lista
        </ButtonLink>
      </div>
    </form>
  );
}
