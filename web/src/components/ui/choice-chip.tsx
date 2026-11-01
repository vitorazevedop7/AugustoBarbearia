import type { ComponentProps } from "react";

type ChoiceChipProps = Omit<ComponentProps<"input">, "type" | "name"> & {
  name: string;
  value: string;
  label: string;
};

/**
 * Opção única em formato de chip (ex.: horário livre). É um `radio` de verdade,
 * então funciona em formulário sem JS e é navegável pelas setas do teclado.
 */
export function ChoiceChip({
  label,
  className = "",
  ...props
}: ChoiceChipProps) {
  return (
    <label
      className={`relative inline-flex min-h-11 cursor-pointer items-center justify-center border border-ink-muted bg-surface px-4 py-2 text-sm font-semibold text-ink tabular-nums transition-colors duration-300 ease-standard hover:border-ink has-checked:border-brand has-checked:bg-brand has-checked:text-surface has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand has-disabled:cursor-not-allowed has-disabled:border-line has-disabled:bg-paper has-disabled:text-ink-muted has-disabled:line-through motion-reduce:transition-none ${className}`}
    >
      <input type="radio" className="sr-only" {...props} />
      {label}
    </label>
  );
}
