import type { ReactNode } from "react";
import { formatDuration, formatList, formatPrice } from "@/lib/format";
import { ButtonLink } from "./button";

/**
 * A tabela de preços da vitrine, como a da parede da barbearia: sem card,
 * só as linhas separadas por filetes, de ponta a ponta do container. Recebe
 * os `ServiceItem` numa `ul`.
 */
export function ServiceCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`border-t-2 border-ink ${className}`}>{children}</div>;
}

/**
 * Uma linha da tabela: o nome do serviço com a duração e quem realiza à
 * esquerda, o preço grande e o link para agendar à direita. O título é `h2`
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
    <article className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-6 gap-y-5 py-7 md:grid-cols-12 md:items-center md:gap-x-8 md:py-9">
      <div className="min-w-0 md:col-span-7">
        <Heading className="font-heading text-display-3 font-normal text-ink">
          {name}
        </Heading>
        <p className="mt-2 text-sm font-semibold text-ink tabular-nums">
          <span className="sr-only">Duração: </span>
          {formatDuration(durationMinutes)}
        </p>
        {description ? (
          <p className="mt-2 max-w-xl text-body text-ink-muted">
            {description}
          </p>
        ) : null}
        {barbers.length > 0 ? (
          <p className="mt-1 text-sm text-ink-muted">
            Com {formatList(barbers)}
          </p>
        ) : null}
      </div>
      <p className="font-heading text-display-3 font-normal text-ink tabular-nums md:col-span-3 md:text-right">
        <span className="sr-only">Preço: </span>
        {formatPrice(price)}
      </p>
      <div className="col-span-2 md:col-span-2 md:flex md:justify-end">
        <ButtonLink
          href={href}
          variant="outline"
          size="sm"
          aria-label={`Agendar ${name}`}
          className="w-full md:w-auto"
        >
          Agendar
        </ButtonLink>
      </div>
    </article>
  );
}
