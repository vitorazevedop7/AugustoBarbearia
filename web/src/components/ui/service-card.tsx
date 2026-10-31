import { formatDuration, formatList, formatPrice } from "@/lib/format";
import { ButtonLink } from "./button";

/**
 * Card de serviço da vitrine: nome, duração, preço, descrição, quem realiza e
 * a chamada para agendar. O título é `h2` numa lista solta e `h3` dentro de
 * uma seção com título.
 */
export function ServiceCard({
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
    <article className="flex h-full flex-col bg-surface p-6 shadow-card sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <Heading className="font-heading text-display-3 font-black uppercase text-ink">
          {name}
        </Heading>
        <p className="shrink-0 font-heading text-display-3 font-black text-brand tabular-nums">
          <span className="sr-only">Preço: </span>
          {formatPrice(price)}
        </p>
      </div>
      <p className="mt-2 text-xs font-semibold tracking-[0.08em] text-ink-muted uppercase tabular-nums">
        <span className="sr-only">Duração: </span>
        {formatDuration(durationMinutes)}
      </p>
      {description ? (
        <p className="mt-4 text-body text-ink-muted">{description}</p>
      ) : null}
      {barbers.length > 0 ? (
        <p className="mt-4 text-sm text-ink-muted">Com {formatList(barbers)}</p>
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
