"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextAreaField, TextField } from "@/components/ui/field";
import { formatPhone } from "@/lib/format";
import { saveShop } from "./actions";
import type { FormState, ShopUpdate } from "./form-data";

const initialState: FormState = { status: "idle" };

export function ShopForm({ shop }: { shop: ShopUpdate }) {
  const [state, action, pending] = useActionState(saveShop, initialState);
  // Depois de um erro, o formulário volta com o que foi digitado, e não com o salvo.
  const value = (field: keyof ShopUpdate) =>
    state.values?.[field] ?? displayValue(shop, field);

  return (
    <form action={action} className="flex max-w-2xl flex-col gap-6">
      {state.status === "error" ? (
        <Alert tone="danger" title={state.message ?? ""} />
      ) : null}
      {state.status === "success" ? (
        <Alert tone="success" title={state.message ?? ""} />
      ) : null}
      <TextField
        name="name"
        label="Nome"
        maxLength={80}
        defaultValue={value("name")}
      />
      <TextField
        name="tagline"
        label="Frase de destaque"
        optional
        maxLength={160}
        hint="Aparece no topo da página inicial."
        defaultValue={value("tagline")}
      />
      <TextAreaField
        name="about"
        label="Sobre a barbearia"
        optional
        maxLength={1000}
        hint="Até 1000 caracteres."
        defaultValue={value("about")}
      />
      <TextField
        name="address"
        label="Endereço"
        optional
        maxLength={200}
        autoComplete="street-address"
        hint="Rua, número e bairro, como o cliente digitaria no mapa."
        defaultValue={value("address")}
      />
      <TextField
        name="phone"
        label="Telefone"
        optional
        type="tel"
        inputMode="tel"
        hint="Com DDD, como (75) 3333-4444."
        defaultValue={value("phone")}
      />
      <TextField
        name="whatsapp"
        label="WhatsApp"
        optional
        type="tel"
        inputMode="tel"
        hint="Com DDD, como (75) 99999-0000."
        defaultValue={value("whatsapp")}
      />
      <TextField
        name="instagram"
        label="Instagram"
        optional
        autoCapitalize="none"
        hint="O nome de usuário, com ou sem @."
        defaultValue={value("instagram")}
      />
      <TextField
        name="email"
        label="E-mail"
        optional
        type="email"
        autoComplete="email"
        defaultValue={value("email")}
      />
      <div>
        <Button type="submit" pending={pending} className="w-full sm:w-auto">
          Salvar dados
        </Button>
      </div>
    </form>
  );
}

function displayValue(shop: ShopUpdate, field: keyof ShopUpdate): string {
  const stored = shop[field] ?? "";
  if (!stored) return "";
  if (field === "phone" || field === "whatsapp") return formatPhone(stored);
  if (field === "instagram") return `@${stored}`;
  return stored;
}
