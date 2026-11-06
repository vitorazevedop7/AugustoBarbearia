import { ButtonLink } from "@/components/ui/button";
import { BOOKING_PATH } from "@/lib/booking";

/**
 * Faixa escura entre a galeria e a equipe: a frase grande à esquerda e, à
 * direita, o que acontece depois e o botão. Só tipo, sem foto: as seções
 * vizinhas já são de fotos.
 */
export function BookingBand() {
  return (
    <section
      aria-labelledby="agendar-titulo"
      className="bg-ink px-4 py-section text-surface sm:px-6 lg:px-8"
    >
      <div
        className="mx-auto grid max-w-site gap-8 lg:grid-cols-12 lg:items-end lg:gap-8"
        data-reveal="rise"
      >
        <h2
          id="agendar-titulo"
          className="font-heading text-display-1 font-black uppercase text-surface lg:col-span-7"
        >
          Agende pelo celular
        </h2>
        <div className="flex flex-col gap-6 lg:col-span-4 lg:col-start-9">
          <p className="max-w-md text-lead text-on-ink-muted">
            Escolha o barbeiro, o serviço e o horário. Receba a confirmação por
            e-mail.
          </p>
          <div>
            <ButtonLink href={BOOKING_PATH} className="w-full sm:w-auto">
              Agendar horário
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
