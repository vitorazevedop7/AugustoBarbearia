import Link from "next/link";
import { BarberPhoto } from "@/components/ui/barber-photo";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { PublicBarber, PublicService } from "@/lib/api/public";
import { BOOKING_PATH } from "@/lib/booking";
import { formatDuration, formatPrice } from "@/lib/format";

const cardLink =
  "group flex h-full bg-surface shadow-card outline-offset-4 transition-colors duration-300 ease-out hover:bg-paper focus-visible:outline-2 focus-visible:outline-brand motion-reduce:transition-none";

/** Etapa 1: os barbeiros em cards com foto (ou a inicial) e nome. */
export function BarberStep({
  barbers,
  hrefFor,
}: {
  barbers: PublicBarber[];
  hrefFor: (barber: PublicBarber) => string;
}) {
  if (barbers.length === 0) {
    return (
      <EmptyState
        title="Nenhum barbeiro disponível no momento"
        description="Tente de novo mais tarde ou fale com a barbearia."
      />
    );
  }
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6">
      {barbers.map((barber) => (
        <li key={barber.id}>
          <Link href={hrefFor(barber)} className={`${cardLink} flex-col`}>
            <BarberPhoto
              name={barber.name}
              photoPath={barber.photo_path}
              sizes="(min-width: 640px) 240px, 50vw"
              zoom
              decorative
            />
            <span className="p-4 font-heading text-display-4 font-black uppercase text-ink">
              {barber.name}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Etapa 2: os serviços que o barbeiro realiza, com duração e preço. */
export function ServiceStep({
  services,
  barberName,
  hrefFor,
}: {
  services: PublicService[];
  barberName: string;
  hrefFor: (service: PublicService) => string;
}) {
  if (services.length === 0) {
    return (
      <EmptyState
        title={`${barberName} não tem serviços disponíveis`}
        description="Escolha outro barbeiro para continuar."
        action={
          <ButtonLink href={BOOKING_PATH} variant="outline" size="sm">
            Escolher outro barbeiro
          </ButtonLink>
        }
      />
    );
  }
  return (
    <ul className="flex flex-col gap-4">
      {services.map((service) => (
        <li key={service.id}>
          <Link
            href={hrefFor(service)}
            className={`${cardLink} items-start justify-between gap-4 p-5 sm:p-6`}
          >
            <span className="flex min-w-0 flex-col gap-1">
              <span className="font-heading text-display-4 font-black uppercase text-ink">
                {service.name}
              </span>
              <span className="text-xs font-semibold tracking-[0.08em] text-ink-muted uppercase tabular-nums">
                <span className="sr-only">Duração: </span>
                {formatDuration(service.duration_minutes)}
              </span>
              {service.description ? (
                <span className="mt-1 text-sm leading-relaxed text-ink-muted">
                  {service.description}
                </span>
              ) : null}
            </span>
            <span className="shrink-0 font-heading text-display-4 font-black text-brand tabular-nums">
              <span className="sr-only">Preço: </span>
              {formatPrice(service.price)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
