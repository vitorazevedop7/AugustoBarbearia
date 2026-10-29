import type { PublicBarber, PublicService } from "@/lib/api/public";
import type { BookingSelection } from "@/lib/booking";

export type ResolvedSelection = {
  selection: BookingSelection;
  barber?: PublicBarber;
  service?: PublicService;
};

/**
 * Confere as escolhas da URL com o que a vitrine oferece agora (rotas
 * `/public`). Um barbeiro ou serviço que não está na vitrine, ou um serviço
 * que o barbeiro não realiza, é ignorado, e o fluxo volta para a etapa que
 * falta. Quem decide o que é oferecido é a API (RN-05, RN-60, RN-61).
 */
export function resolveSelection(
  requested: BookingSelection,
  barbers: PublicBarber[],
  services: PublicService[],
): ResolvedSelection {
  const barber = barbers.find(({ id }) => id === requested.barbeiro);
  const service = services.find(
    ({ id, barbers: performers }) =>
      id === requested.servico &&
      (!barber ||
        performers.some(({ id: performer }) => performer === barber.id)),
  );
  const selection: BookingSelection = {};
  if (barber) selection.barbeiro = barber.id;
  if (service) selection.servico = service.id;
  if (barber && service && requested.data) {
    selection.data = requested.data;
    if (requested.hora) selection.hora = requested.hora;
  }
  return { selection, barber, service };
}

/** Os barbeiros da etapa 1: com um serviço já escolhido, só quem o realiza. */
export function barbersFor(
  barbers: PublicBarber[],
  service: PublicService | undefined,
): PublicBarber[] {
  if (!service) return barbers;
  return barbers.filter(({ id }) =>
    service.barbers.some(({ id: performer }) => performer === id),
  );
}

/** Os serviços da etapa 2: só os que o barbeiro realiza. */
export function servicesFor(
  services: PublicService[],
  barber: PublicBarber,
): PublicService[] {
  return services.filter((service) =>
    service.barbers.some(({ id }) => id === barber.id),
  );
}
