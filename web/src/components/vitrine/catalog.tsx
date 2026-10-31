import type { CSSProperties } from "react";
import { Alert } from "@/components/ui/alert";
import { BarberCard } from "@/components/ui/barber-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ServiceCard, ServiceItem } from "@/components/ui/service-card";
import type { PublicBarber, PublicService } from "@/lib/api/public";
import { bookingHref } from "@/lib/booking";

/**
 * Posição do card na grade, para a cascata da entrada ao rolar: o CSS soma
 * 200ms por coluna (`--reveal-cols`, que a `ul` ajusta por breakpoint).
 */
function revealIndex(index: number): CSSProperties {
  return { "--reveal-index": index } as CSSProperties;
}

/**
 * Serviços da vitrine num card branco único, na ordem da API, em 1 coluna no
 * celular e 2 a partir do `md`. `null` = a API não respondeu. Com `limit`,
 * mostra só os primeiros (a página inicial).
 */
export function ServiceList({
  services,
  limit,
  headingLevel,
}: {
  services: PublicService[] | null;
  limit?: number;
  headingLevel?: "h2" | "h3";
}) {
  if (!services) {
    return (
      <Alert
        tone="danger"
        title="Não foi possível carregar os serviços. Tente novamente em instantes."
      />
    );
  }
  if (services.length === 0) {
    return (
      <EmptyState
        title="Nenhum serviço disponível no momento"
        description="Volte mais tarde ou fale com a barbearia."
      />
    );
  }
  return (
    <ServiceCard>
      <ul className="grid gap-x-16 gap-y-12 [--reveal-cols:1] md:grid-cols-2 md:[--reveal-cols:2]">
        {services.slice(0, limit).map((service, index) => (
          <li key={service.id} data-reveal="rise" style={revealIndex(index)}>
            <ServiceItem
              name={service.name}
              description={service.description}
              price={service.price}
              durationMinutes={service.duration_minutes}
              barbers={service.barbers.map((barber) => barber.name)}
              href={bookingHref({ servico: service.id })}
              headingLevel={headingLevel}
            />
          </li>
        ))}
      </ul>
    </ServiceCard>
  );
}

/** Largura do card: 1 coluna, 2 a partir do `sm` e 3 a partir do `lg`, até 1340px. */
const PHOTO_SIZES =
  "(min-width: 1404px) 428px, (min-width: 1024px) calc((100vw - 7.5rem) / 3), (min-width: 640px) calc((100vw - 4.5rem) / 2), calc(100vw - 2rem)";

/** Deslocamento de cada coluna da grade de barbeiros no desktop: 0, 75 e 145px. */
const STEPS = ["", "lg:mt-[75px]", "lg:mt-[145px]"];

/**
 * Barbeiros ativos em cards, na ordem da API. `null` = a API não respondeu.
 * No desktop (3 colunas), os cards descem em degraus de 0, 75 e 145px, como a
 * equipe do Beard X; no celular e no tablet, ficam alinhados. O degrau é
 * margem, e não `transform`, para não brigar com o `rise` da entrada ao rolar.
 */
export function BarberList({
  barbers,
  headingLevel,
  fullBio,
}: {
  barbers: PublicBarber[] | null;
  headingLevel?: "h2" | "h3";
  /** Apresentação inteira abaixo da foto (página dos barbeiros). */
  fullBio?: boolean;
}) {
  if (!barbers) {
    return (
      <Alert
        tone="danger"
        title="Não foi possível carregar os barbeiros. Tente novamente em instantes."
      />
    );
  }
  if (barbers.length === 0) {
    return (
      <EmptyState
        title="Nenhum barbeiro disponível no momento"
        description="Volte mais tarde ou fale com a barbearia."
      />
    );
  }
  return (
    <ul className="grid gap-6 [--reveal-cols:1] sm:grid-cols-2 sm:[--reveal-cols:2] lg:grid-cols-3 lg:items-start lg:gap-7 lg:[--reveal-cols:3]">
      {barbers.map((barber, index) => (
        <li
          key={barber.id}
          data-reveal="rise"
          style={revealIndex(index)}
          className={STEPS[index % STEPS.length]}
        >
          <BarberCard
            name={barber.name}
            photoPath={barber.photo_path}
            bio={barber.bio}
            href={bookingHref({ barbeiro: barber.id })}
            sizes={PHOTO_SIZES}
            headingLevel={headingLevel}
            fullBio={fullBio}
          />
        </li>
      ))}
    </ul>
  );
}
