import type { ComponentProps, ReactNode } from "react";

/** Borda em `ink-muted`: `line` não tem o contraste de 3:1 exigido para contorno de campo. */
const control =
  "block min-h-12 w-full border border-ink-muted bg-surface px-4 py-3 text-base text-ink placeholder:text-ink-muted transition-colors duration-300 ease-standard focus:border-brand focus:outline-2 focus:-outline-offset-2 focus:outline-brand aria-invalid:border-danger aria-invalid:focus:outline-danger disabled:cursor-not-allowed disabled:bg-paper disabled:text-ink-muted motion-reduce:transition-none";

type FieldMeta = {
  label: string;
  hint?: string;
  /** Mensagem já pronta para o usuário, como o `message` de erro da API. */
  error?: string;
  /** A maioria dos campos é obrigatória, então só o opcional ganha marca. */
  optional?: boolean;
};

function FieldShell({
  id,
  label,
  hint,
  error,
  optional,
  children,
}: FieldMeta & { id: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
        {optional ? (
          <span className="font-normal text-ink-muted"> (opcional)</span>
        ) : null}
      </label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, { hint, error }: FieldMeta) {
  const ids = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

type TextFieldProps = Omit<ComponentProps<"input">, "name"> &
  FieldMeta & { name: string };

/** Campo de texto com rótulo, dica e erro ligados por `aria-describedby`. */
export function TextField({
  label,
  hint,
  error,
  optional,
  id,
  name,
  className = "",
  ...props
}: TextFieldProps) {
  const fieldId = id ?? name;
  const meta = { label, hint, error, optional };
  return (
    <FieldShell id={fieldId} {...meta}>
      <input
        id={fieldId}
        name={name}
        required={!optional}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, meta)}
        className={`${control} ${className}`}
        {...props}
      />
    </FieldShell>
  );
}

type SelectFieldProps = Omit<ComponentProps<"select">, "name"> &
  FieldMeta & { name: string };

/** Lista de opções nativa: funciona sem JS e usa o seletor do próprio celular. */
export function SelectField({
  label,
  hint,
  error,
  optional,
  id,
  name,
  className = "",
  children,
  ...props
}: SelectFieldProps) {
  const fieldId = id ?? name;
  const meta = { label, hint, error, optional };
  return (
    <FieldShell id={fieldId} {...meta}>
      <div className="relative">
        <select
          id={fieldId}
          name={name}
          required={!optional}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fieldId, meta)}
          className={`${control} appearance-none pr-12 ${className}`}
          {...props}
        >
          {children}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-ink"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </FieldShell>
  );
}

type TextAreaFieldProps = Omit<ComponentProps<"textarea">, "name"> &
  FieldMeta & { name: string };

/** Texto de várias linhas, como a apresentação da barbearia ou do barbeiro. */
export function TextAreaField({
  label,
  hint,
  error,
  optional,
  id,
  name,
  rows = 4,
  className = "",
  ...props
}: TextAreaFieldProps) {
  const fieldId = id ?? name;
  const meta = { label, hint, error, optional };
  return (
    <FieldShell id={fieldId} {...meta}>
      <textarea
        id={fieldId}
        name={name}
        rows={rows}
        required={!optional}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, meta)}
        className={`${control} resize-y ${className}`}
        {...props}
      />
    </FieldShell>
  );
}
