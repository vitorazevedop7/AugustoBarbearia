import { TextField } from "@/components/ui/field";

export type CustomerFieldValues = {
  name: string;
  phone: string;
  email: string;
};

/**
 * Nome, telefone e e-mail de um cliente (RN-20, RN-62), para qualquer formulário
 * da administração: o cadastro de clientes e, depois, o agendamento manual.
 * O formulário que o contém cuida do envio. Os campos mantêm os nomes `name`,
 * `phone` e `email`, lidos por `parseCustomerForm`.
 */
export function CustomerFields({
  values,
  emailLocked = false,
  phoneOptional = false,
}: {
  values: CustomerFieldValues;
  /** O e-mail de quem tem conta Google vem do Google e não muda aqui (RN-23). */
  emailLocked?: boolean;
  /** Quem veio do Google pode ainda não ter telefone; a edição não o exige. */
  phoneOptional?: boolean;
}) {
  return (
    <>
      <TextField
        name="name"
        label="Nome"
        maxLength={120}
        autoComplete="off"
        defaultValue={values.name}
      />
      <TextField
        name="phone"
        label="Telefone"
        type="tel"
        inputMode="tel"
        autoComplete="off"
        maxLength={30}
        optional={phoneOptional}
        hint="Com DDD. Exemplo: (11) 98765-4321."
        defaultValue={values.phone}
      />
      {emailLocked ? (
        <TextField
          name="email"
          label="E-mail"
          type="email"
          readOnly
          hint="Vem da conta Google do cliente e não pode ser alterado."
          defaultValue={values.email}
        />
      ) : (
        <TextField
          name="email"
          label="E-mail"
          type="email"
          optional
          maxLength={320}
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
          hint="Se o cliente entrar com o Google usando este e-mail, o cadastro dele é aproveitado."
          defaultValue={values.email}
        />
      )}
    </>
  );
}
