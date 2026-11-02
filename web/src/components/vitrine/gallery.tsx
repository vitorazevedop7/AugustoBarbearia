import { ButtonLink } from "@/components/ui/button";
import { FramedPhoto } from "@/components/ui/framed-photo";
import { SectionHeading } from "@/components/ui/section-heading";
import { BOOKING_PATH } from "@/lib/booking";
import { vitrinePhotos } from "@/lib/vitrine-photos";

const sizes =
  "(min-width: 1404px) 428px, (min-width: 1024px) calc((100vw - 7.5rem) / 3), (min-width: 640px) calc((100vw - 3.75rem) / 2), calc((100vw - 2.75rem) / 2)";

/** Galeria assimétrica da D14, com a ordem de leitura preservada no celular. */
export function Gallery({ surface = false }: { surface?: boolean }) {
  return (
    <section
      aria-labelledby="galeria-titulo"
      className={`px-4 py-section sm:px-6 lg:px-8 ${surface ? "bg-surface" : "bg-paper"}`}
    >
      <div className="mx-auto max-w-site">
        <div data-reveal="rise">
          <SectionHeading
            id="galeria-titulo"
            title="Nosso trabalho"
            description="Cortes, barba e os detalhes de cada cuidado."
          />
        </div>
        <div className="mt-12 grid grid-cols-2 items-start gap-3 lg:mt-16 lg:grid-cols-3 lg:gap-7">
          <FramedPhoto
            photo={vitrinePhotos.galleryFade}
            sizes={sizes}
            ratioClassName="aspect-[3/4] lg:aspect-[2/3]"
            className="lg:mt-20"
            data-reveal="zoom"
          />
          <div className="contents lg:grid lg:gap-7">
            <FramedPhoto
              photo={vitrinePhotos.galleryRazor}
              sizes={sizes}
              ratioClassName="aspect-[3/4] lg:aspect-[5/4]"
              data-reveal="zoom"
            />
            <FramedPhoto
              photo={vitrinePhotos.galleryTools}
              sizes={sizes}
              ratioClassName="aspect-[3/4] lg:aspect-square"
              data-reveal="zoom"
            />
          </div>
          <FramedPhoto
            photo={vitrinePhotos.galleryBeard}
            sizes={sizes}
            ratioClassName="aspect-[3/4] lg:aspect-[2/3]"
            className="lg:mt-20"
            data-reveal="zoom"
          />
        </div>
        <div className="mt-10 text-center">
          <ButtonLink href={BOOKING_PATH} className="w-full sm:w-auto">
            Agendar horário
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
