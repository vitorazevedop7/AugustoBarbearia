import type { CSSProperties } from "react";
import { Alert } from "@/components/ui/alert";
import { BarberCard } from "@/components/ui/barber-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ServiceCard } from "@/components/ui/service-card";
import type { PublicBarber, PublicService } from "@/lib/api/public";
import { bookingHref } from "@/lib/booking";

/** Atraso da entrada ao rolar, em cascata pelos cards de uma grade. */
function revealDelay(index: number): CSSProperties {
  return { "--reveal-delay": `${(index % 3) * 100}ms` } as CSSProperties;
}

/**
 * Serviços da vitrine em cards, na ordem da API. `null` = a API não respondeu.
 * Com `limit`, mostra só os primeiros (a página inicial).
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
    <ul className="grid gap-6 md:grid-cols-2">
      {services.slice(0, limit).map((service, index) => (
        <li key={service.id} data-reveal style={revealDelay(index)}>
          <ServiceCard
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
  );
}

const PHOTO_SIZES = "(min-width: 1280px) 400px, (min-width: 640px) 50vw, 100vw";

/** Barbeiros ativos em cards, na ordem da API. `null` = a API não respondeu. */
export function BarberList({
  barbers,
  headingLevel,
}: {
  barbers: PublicBarber[] | null;
  headingLevel?: "h2" | "h3";
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
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {barbers.map((barber, index) => (
        <li key={barber.id} data-reveal style={revealDelay(index)}>
          <BarberCard
            name={barber.name}
            photoPath={barber.photo_path}
            bio={barber.bio}
            href={bookingHref({ barbeiro: barber.id })}
            sizes={PHOTO_SIZES}
            headingLevel={headingLevel}
          />
        </li>
      ))}
    </ul>
  );
}
