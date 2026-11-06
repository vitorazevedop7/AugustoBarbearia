import type { CSSProperties } from "react";
import { Alert } from "@/components/ui/alert";
import { BarberCard } from "@/components/ui/barber-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ServiceCard, ServiceItem } from "@/components/ui/service-card";
import type { PublicBarber, PublicService } from "@/lib/api/public";
import { bookingHref } from "@/lib/booking";

/**
 * Posição do card na grade, para a cascata da entrada ao rolar: o CSS soma
 * 50ms por coluna (`--reveal-cols`, que a `ul` ajusta por breakpoint).
 */
function revealIndex(index: number): CSSProperties {
  return { "--reveal-index": index } as CSSProperties;
}

/**
 * Serviços da vitrine como a tabela de preços: uma linha por serviço, na
 * ordem da API. `null` = a API não respondeu. Com `limit`,
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
      <ul className="divide-y divide-line border-b border-line [--reveal-cols:1]">
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

/** Largura do card: 1 coluna e 3 a partir do `md`, até 1340px (três barbeiros sem um sozinho na última linha). */
const PHOTO_SIZES =
  "(min-width: 1404px) 425px, (min-width: 768px) calc((100vw - 7rem) / 3), calc(100vw - 2rem)";

/**
 * Barbeiros ativos em cards, na ordem da API. `null` = a API não respondeu.
 * Os três formam um conjunto: retratos do mesmo tamanho, topos alinhados.
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
    <ul className="grid gap-x-6 gap-y-14 [--reveal-cols:1] md:grid-cols-[repeat(3,minmax(0,1fr))] md:[--reveal-cols:3] lg:gap-x-8">
      {barbers.map((barber, index) => (
        <li key={barber.id} data-reveal="rise" style={revealIndex(index)}>
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
