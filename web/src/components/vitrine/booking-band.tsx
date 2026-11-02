import { ButtonLink } from "@/components/ui/button";
import { FixedPhotoLayer } from "@/components/ui/fixed-photo-layer";
import { Ornament } from "@/components/ui/ornament";
import { BOOKING_PATH } from "@/lib/booking";
import { vitrinePhotos } from "@/lib/vitrine-photos";

/** A faixa de vídeo da referência vira uma chamada para o fluxo existente. */
export function BookingBand() {
  return (
    <section
      aria-labelledby="agendar-titulo"
      className="relative isolate flex items-center justify-center bg-ink px-4 py-section text-center [clip-path:inset(0)] sm:px-6 lg:min-h-[70svh] lg:px-8"
    >
      <FixedPhotoLayer
        photo={vitrinePhotos.bookingBand}
        imageClassName="object-[55%_50%] brightness-75"
      />
      <div className="relative mx-auto max-w-3xl" data-reveal="rise">
        <Ornament tone="dark" />
        <h2
          id="agendar-titulo"
          className="mt-6 font-heading text-display-2 font-black uppercase text-surface"
        >
          Agende pelo celular
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-body text-on-ink-muted">
          Escolha o barbeiro, o serviço e o horário. Receba a confirmação por
          e-mail.
        </p>
        <div className="mt-10">
          <ButtonLink href={BOOKING_PATH} className="w-full sm:w-auto">
            Agendar horário
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
