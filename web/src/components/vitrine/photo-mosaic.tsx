import { FramedPhoto } from "@/components/ui/framed-photo";
import { SectionHeading } from "@/components/ui/section-heading";
import { contactLinks } from "@/lib/contact";
import { vitrinePhotos } from "@/lib/vitrine-photos";

const smallSizes =
  "(min-width: 1404px) 314px, (min-width: 1024px) calc(25vw - 37px), (min-width: 640px) calc(50vw - 30px), calc(50vw - 22px)";
const highlightSizes =
  "(min-width: 1404px) 656px, (min-width: 1024px) calc(50vw - 46px), (min-width: 640px) calc(100vw - 48px), calc(100vw - 32px)";

/** Fotos da vitrine, sem simular publicações ou depender do Instagram. */
export function PhotoMosaic({ instagram }: { instagram?: string | null }) {
  const instagramLink = contactLinks({ instagram })[0];

  return (
    <section
      aria-labelledby="mosaic-title"
      className="bg-surface px-4 py-section sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-site">
        <div data-reveal="rise">
          <SectionHeading id="mosaic-title" title="Nosso trabalho" />
        </div>

        {/* O destaque mede duas laterais + o gap. A correção de 14px na
            coluna central mantém as cinco fotos quadradas e alinhadas. */}
        <div className="mt-12 grid grid-cols-2 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,calc(50%_-_14px))_minmax(0,1fr)] lg:grid-rows-2 lg:gap-7">
          <FramedPhoto
            photo={vitrinePhotos.mosaicHighlight}
            sizes={highlightSizes}
            ratioClassName="aspect-square"
            className="col-span-2 min-w-0 lg:col-span-1 lg:col-start-2 lg:row-span-2 lg:row-start-1"
            data-reveal="zoom"
          />
          <FramedPhoto
            photo={vitrinePhotos.mosaicOne}
            sizes={smallSizes}
            ratioClassName="aspect-square"
            className="min-w-0 lg:col-start-1 lg:row-start-1"
            data-reveal="zoom"
          />
          <FramedPhoto
            photo={vitrinePhotos.mosaicTwo}
            sizes={smallSizes}
            ratioClassName="aspect-square"
            className="min-w-0 lg:col-start-3 lg:row-start-1"
            data-reveal="zoom"
          />
          <FramedPhoto
            photo={vitrinePhotos.mosaicThree}
            sizes={smallSizes}
            ratioClassName="aspect-square"
            className="min-w-0 lg:col-start-1 lg:row-start-2"
            data-reveal="zoom"
          />
          <FramedPhoto
            photo={vitrinePhotos.mosaicFour}
            sizes={smallSizes}
            ratioClassName="aspect-square"
            className="min-w-0 lg:col-start-3 lg:row-start-2"
            data-reveal="zoom"
          />
        </div>

        {instagramLink ? (
          <div className="mt-10 text-center" data-reveal="rise">
            <a
              href={instagramLink.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-3 font-semibold text-ink underline decoration-ink-muted underline-offset-4 transition-colors duration-300 ease-standard hover:text-brand hover:decoration-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand motion-reduce:transition-none"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="size-6 shrink-0"
              >
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
              </svg>
              Ver mais no Instagram
              <span className="sr-only"> (abre em outra aba)</span>
            </a>
          </div>
        ) : null}
      </div>
    </section>
  );
}
