import { BarberPhoto } from "./barber-photo";
import { ButtonLink } from "./button";

/**
 * Card de barbeiro da vitrine: foto 4:5 (ou a inicial), nome, apresentação e
 * "Agendar com <nome>". O texto fica abaixo da foto, e não sobre ela, para
 * funcionar igual com e sem foto.
 */
export function BarberCard({
  name,
  photoPath,
  bio,
  href,
  sizes,
  headingLevel = "h3",
}: {
  name: string;
  photoPath: string | null;
  bio: string | null;
  href: string;
  sizes: string;
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  return (
    <article className="group flex h-full flex-col bg-surface shadow-card">
      <BarberPhoto name={name} photoPath={photoPath} sizes={sizes} zoom />
      <div className="flex flex-1 flex-col p-6 sm:p-8">
        <Heading className="font-heading text-xl font-bold text-ink">
          {name}
        </Heading>
        {bio ? (
          <p className="mt-3 leading-relaxed whitespace-pre-line text-ink-muted">
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
      </div>
    </article>
  );
}
