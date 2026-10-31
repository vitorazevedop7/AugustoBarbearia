import type { ReactNode } from "react";
import { formatDuration, formatList, formatPrice } from "@/lib/format";
import { ButtonLink } from "./button";

/**
 * Card branco único dos serviços, como o do Beard X: uma moldura com muito
 * respiro (48×24px no celular, 102×64px no desktop) que recebe os
 * `ServiceItem` numa grade, normalmente uma `ul` de 1 coluna no celular e 2 a
 * partir do `md`.
 */
export function ServiceCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-surface px-6 py-12 shadow-card sm:px-10 sm:py-16 lg:px-16 lg:py-25.5 ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Um serviço dentro do `ServiceCard`: nome e preço na mesma linha, duração,
 * descrição opcional, quem realiza e o link para agendar. O título é `h2`
 * numa página que só tem o `h1` antes e `h3` dentro de uma seção com título.
 */
export function ServiceItem({
  name,
  description,
  price,
  durationMinutes,
  barbers,
  href,
  headingLevel = "h3",
}: {
  name: string;
  description: string | null;
  /** Preço da API, uma string decimal ("25.00"). */
  price: string;
  durationMinutes: number;
  /** Nomes de quem realiza o serviço. */
  barbers: string[];
  href: string;
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  return (
    <article className="flex h-full flex-col">
      <div className="flex items-baseline justify-between gap-4 border-b border-line pb-4">
        <Heading className="min-w-0 font-heading text-display-4 font-black uppercase text-ink">
          {name}
        </Heading>
        <p className="shrink-0 font-heading text-display-4 font-black text-brand tabular-nums">
          <span className="sr-only">Preço: </span>
          {formatPrice(price)}
        </p>
      </div>
      <p className="mt-4 text-xs font-semibold tracking-[0.08em] text-ink-muted uppercase tabular-nums">
        <span className="sr-only">Duração: </span>
        {formatDuration(durationMinutes)}
      </p>
      {description ? (
        <p className="mt-3 text-body text-ink-muted">{description}</p>
      ) : null}
      {barbers.length > 0 ? (
        <p className="mt-3 text-sm text-ink-muted">Com {formatList(barbers)}</p>
      ) : null}
      <div className="mt-auto pt-6">
        <ButtonLink
          href={href}
          variant="outline"
          size="sm"
          aria-label={`Agendar ${name}`}
          className="w-full sm:w-auto"
        >
          Agendar
        </ButtonLink>
      </div>
    </article>
  );
}
