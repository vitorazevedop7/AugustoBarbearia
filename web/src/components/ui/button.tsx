import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "outline" | "outline-light";
type Size = "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 border-2 font-sans font-semibold tracking-[0.08em] uppercase transition-[background-color,border-color,color,transform] duration-300 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 motion-reduce:transition-none motion-reduce:hover:translate-y-0";

const variants: Record<Variant, string> = {
  primary:
    "border-brand bg-brand text-surface hover:border-brand-strong hover:bg-brand-strong focus-visible:outline-brand",
  outline:
    "border-ink text-ink hover:bg-ink hover:text-paper focus-visible:outline-ink",
  "outline-light":
    "border-surface text-surface hover:bg-surface hover:text-ink focus-visible:outline-surface",
};

const sizes: Record<Size, string> = {
  md: "min-h-14 px-7 py-4 text-sm",
  sm: "min-h-11 px-5 py-2.5 text-xs",
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

/** Botão quadrado em caixa alta (padrão da referência Beard X). */
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
