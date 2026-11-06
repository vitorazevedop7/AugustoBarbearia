import { ButtonLink } from "@/components/ui/button";
import { FramedPhoto } from "@/components/ui/framed-photo";
import { SectionHeading } from "@/components/ui/section-heading";
import { BOOKING_PATH } from "@/lib/booking";
import { vitrinePhotos } from "@/lib/vitrine-photos";

const leadSizes =
  "(min-width: 1404px) 530px, (min-width: 1024px) calc((100vw - 4rem) * 5 / 12), (min-width: 640px) calc(50vw - 2rem), calc(100vw - 2rem)";
const wideSizes =
  "(min-width: 1404px) 760px, (min-width: 1024px) calc((100vw - 4rem) * 7 / 12), (min-width: 640px) calc(50vw - 2rem), calc(100vw - 2rem)";
const smallSizes =
  "(min-width: 1404px) 380px, (min-width: 1024px) calc((100vw - 4rem) * 7 / 24), calc(50vw - 1.5rem)";

/**
 * Galeria em mosaico: o degradê em retrato conduz à esquerda, a navalha em
 * faixa larga à direita e, abaixo dela, a bancada e a barba lado a lado. A
 * ordem de leitura é a mesma no celular.
 */
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
            aside={
              <ButtonLink href={BOOKING_PATH} className="w-full sm:w-auto">
                Agendar horário
              </ButtonLink>
            }
          />
        </div>
        <div className="mt-12 grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 sm:gap-4 lg:mt-16 lg:grid-cols-[repeat(12,minmax(0,1fr))] lg:grid-rows-[auto_auto] lg:gap-8">
          <FramedPhoto
            photo={vitrinePhotos.galleryFade}
            sizes={leadSizes}
            ratioClassName="aspect-[4/5] lg:aspect-auto"
            className="col-span-2 sm:col-span-1 lg:col-span-5 lg:row-span-2"
            data-reveal="zoom"
          />
          <FramedPhoto
            photo={vitrinePhotos.galleryRazor}
            sizes={wideSizes}
            ratioClassName="aspect-[16/10] sm:aspect-[4/5] lg:aspect-[16/10]"
            className="col-span-2 sm:col-span-1 lg:col-span-7"
            data-reveal="zoom"
          />
          <FramedPhoto
            photo={vitrinePhotos.galleryTools}
            sizes={smallSizes}
            ratioClassName="aspect-square lg:aspect-[4/5]"
            className="lg:col-span-3"
            data-reveal="zoom"
          />
          <FramedPhoto
            photo={vitrinePhotos.galleryBeard}
            sizes={smallSizes}
            ratioClassName="aspect-square lg:aspect-auto"
            className="lg:col-span-4"
            data-reveal="zoom"
          />
        </div>
      </div>
    </section>
  );
}
