import { BarberPhoto } from "./barber-photo";
import { ButtonLink } from "./button";

/**
 * Card de barbeiro da vitrine, no padrão do Beard X: foto 6:7 (ou a inicial)
 * com o nome por cima, num degradê escuro, e "Agendar com <nome>" abaixo.
 *
 * O degradê acompanha o texto, e não a foto: um bloco `ink/80`–`ink/90` fica
 * atrás do nome e da apresentação, e só a faixa acima dele esmaece. Assim o
 * contraste passa no AA sobre qualquer foto, mesmo com o nome em duas linhas,
 * e a inicial do barbeiro sem foto continua à vista acima do bloco.
 *
 * Por cima da foto vai só a primeira linha da apresentação. Com `fullBio`
 * (página dos barbeiros), ela sai da foto e aparece inteira abaixo dela.
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
    <article className="group flex h-full flex-col">
      <div className="relative">
        <BarberPhoto
          name={name}
          photoPath={photoPath}
          sizes={sizes}
          ratio="6/7"
          zoom
        />
        <div className="absolute inset-x-0 bottom-0">
          <div
            aria-hidden="true"
            className="h-16 bg-linear-to-t from-ink/80 to-transparent"
          />
          <div className="bg-linear-to-t from-ink/90 to-ink/80 px-6 pb-6 sm:px-8 sm:pb-8">
            <Heading className="font-heading text-display-3 font-black uppercase text-surface">
              {name}
            </Heading>
            {firstLine && !fullBio ? (
              <p className="mt-1 line-clamp-1 text-body text-on-ink-muted">
                {firstLine}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      {bio && fullBio ? (
        <p className="mt-6 text-body whitespace-pre-line text-ink-muted">
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
