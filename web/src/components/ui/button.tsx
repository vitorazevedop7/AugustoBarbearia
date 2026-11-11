import Link from "next/link";
import type { ComponentProps } from "react";

type Variant =
  "primary" | "outline" | "outline-light" | "danger" | "ghost" | "ghost-light";
type Size = "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 border-2 text-center font-button font-black whitespace-nowrap uppercase tracking-[0.02em] transition-[background-color,border-color,color] duration-200 ease-standard focus-visible:outline-2 focus-visible:outline-offset-4 disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none";

/** Um sinal só no hover: a cor. O pressionado escurece um degrau. */
const lift = "";

const variants: Record<Variant, string> = {
  primary: `${lift} border-brand bg-brand text-surface hover:border-brand-strong hover:bg-brand-strong active:border-ink active:bg-ink focus-visible:outline-brand`,
  outline: `${lift} border-ink text-ink hover:bg-ink hover:text-paper active:border-brand-strong active:bg-brand-strong active:text-surface focus-visible:outline-ink`,
  "outline-light": `${lift} border-surface text-surface hover:bg-surface hover:text-ink active:bg-paper-2 active:text-ink focus-visible:outline-surface`,
  danger: `${lift} border-danger text-danger hover:bg-danger hover:text-surface active:bg-brand-strong active:text-surface focus-visible:outline-danger`,
  ghost:
    "border-transparent text-ink underline-offset-4 hover:underline active:text-brand focus-visible:outline-ink",
  "ghost-light":
    "border-transparent text-surface underline-offset-4 hover:underline active:text-on-ink-muted focus-visible:outline-surface",
};

/**
 * `md` é o botão da vitrine: 52px de altura. `sm` (44px) é o compacto da
 * administração, do cabeçalho e das linhas de serviço.
 */
const sizes: Record<Size, string> = {
  md: "min-h-13 px-7 py-3 text-base leading-5",
  sm: "min-h-11 px-5 py-2.5 text-sm leading-5",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
}: { variant?: Variant; size?: Size } = {}) {
  return `${base} ${variants[variant]} ${sizes[size]}`;
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: Size;
};

/** Botão quadrado em caixa alta (padrão da referência Beard X) que navega. */
export function ButtonLink({
  variant,
  size,
  className = "",
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={`${buttonClasses({ variant, size })} ${className}`}
      {...props}
    />
  );
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
  /** Ação em andamento (ex.: Server Action enviando): trava o botão e mostra o indicador. */
  pending?: boolean;
};

/** Botão que executa uma ação. Para navegar, use `ButtonLink`. */
export function Button({
  variant,
  size,
  pending = false,
  disabled,
  type = "button",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={`${buttonClasses({ variant, size })} ${className}`}
      {...props}
    >
      {pending ? <Spinner /> : null}
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4 motion-safe:animate-spin"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="square"
      />
    </svg>
  );
}
