/**
 * Onde começa o agendamento. A rota é implementada na S3.08 (#57); até lá,
 * a chamada "Agendar" da vitrine cai na página 404 (docs/specs/vitrine.md).
 */
export const BOOKING_PATH = "/agendar";

/**
 * Link para agendar já com o serviço ou o barbeiro escolhido, no formato de
 * URL proposto para o fluxo (`?servico=&barbeiro=`).
 */
export function bookingHref(choice: { servico?: number; barbeiro?: number }) {
  const params = new URLSearchParams();
  if (choice.servico !== undefined)
    params.set("servico", String(choice.servico));
  if (choice.barbeiro !== undefined)
    params.set("barbeiro", String(choice.barbeiro));
  const query = params.toString();
  return query ? `${BOOKING_PATH}?${query}` : BOOKING_PATH;
}
