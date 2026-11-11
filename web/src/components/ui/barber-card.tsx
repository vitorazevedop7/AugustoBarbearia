import { BarberPhoto } from "./barber-photo";
import { ButtonLink } from "./button";

/**
 * Card de barbeiro da vitrine: o retrato 4:5 (ou a inicial), limpo, e o nome
 * logo abaixo, na fonte dos títulos, com a primeira linha da apresentação e "Agendar com
 * <nome>". Com `fullBio` (página dos barbeiros), a apresentação aparece
 * inteira.
 */
export function BarberCard({
  name,
  photoPath,
  bio,
  href,
  sizes,
  headingLevel = "h3",
  fullBio = false,
}: {
  name: string;
  photoPath: string | null;
  bio: string | null;
  href: string;
  sizes: string;
  headingLevel?: "h2" | "h3";
  fullBio?: boolean;
}) {
  const Heading = headingLevel;
  const firstLine = bio?.trim().split("\n")[0]?.trim();
  return (
    <article className="flex h-full flex-col">
      <BarberPhoto name={name} photoPath={photoPath} sizes={sizes} />
      <Heading className="mt-6 font-heading text-display-3 font-normal text-ink">
        {name}
      </Heading>
      {firstLine && !fullBio ? (
        <p className="mt-2 line-clamp-1 text-body text-ink-muted">
          {firstLine}
        </p>
      ) : null}
      {bio && fullBio ? (
        <p className="mt-3 text-body whitespace-pre-line text-ink-muted">
          {bio}
        </p>
      ) : null}
      <div className="mt-auto pt-6">
        <ButtonLink
          href={href}
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
        >
          Agendar com {name}
        </ButtonLink>
      </div>
    </article>
  );
}
