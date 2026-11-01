import type { ComponentProps } from "react";

type CheckboxProps = Omit<ComponentProps<"input">, "type" | "name"> & {
  name: string;
  label: string;
};

/**
 * Caixa de seleção para escolher **várias** opções (ex.: os barbeiros de um
 * serviço). É um `checkbox` nativo com o rótulo em volta: funciona sem JS, o
 * rótulo inteiro é clicável e a área de toque tem 44px de altura.
 */
export function Checkbox({ label, className = "", ...props }: CheckboxProps) {
  return (
    <label
      className={`flex min-h-11 cursor-pointer items-center gap-3 text-base text-ink has-disabled:cursor-not-allowed has-disabled:text-ink-muted ${className}`}
    >
      <span className="relative flex size-6 shrink-0 items-center justify-center">
        <input
          type="checkbox"
          className="peer size-6 cursor-pointer appearance-none border border-ink-muted bg-surface transition-colors duration-300 ease-standard checked:border-brand checked:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:border-line disabled:bg-paper motion-reduce:transition-none"
          {...props}
        />
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="pointer-events-none absolute size-4 text-surface opacity-0 peer-checked:opacity-100"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        >
          <path d="m5 12 5 5 9-10" />
        </svg>
      </span>
      {label}
    </label>
  );
}
