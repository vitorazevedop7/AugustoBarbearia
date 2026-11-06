import Image from "next/image";
import type { ReactNode } from "react";

/**
 * Topo das páginas internas da vitrine, como no Beard X: a faixa escura com o
 * único `h1` continua numa faixa parcial (`ink`) atrás do começo do conteúdo,
 * e o card ou as fotos de `children` a atravessam. A faixa parcial é uma
 * camada decorativa atrás do conteúdo (`-z-10` dentro do `isolate`), então o
 * conteúdo não muda de posição se ela mudar de altura. A foto opcional é o
 * LCP da página e carrega com prioridade, como a do hero inicial.
 */
export function PageHero({
  title,
  description,
  photo,
  band = true,
  children,
}: {
  title: string;
  description: string;
  photo?: { src: string };
  /** A faixa parcial que as fotos atravessam. A tabela de preços, que é
   *  tipo sobre o papel, começa abaixo da faixa escura, sem ela. */
  band?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <section
        className={`${photo ? "relative isolate overflow-hidden " : ""}bg-ink px-4 pt-16 pb-12 sm:px-6 md:pb-16 lg:px-8 lg:pt-24 lg:pb-20`}
      >
        {photo ? (
          <div aria-hidden="true" className="absolute inset-0 -z-10">
            <Image
              src={photo.src}
              alt=""
              fill
              sizes="100vw"
              preload
              fetchPriority="high"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-ink/80" />
          </div>
        ) : null}
        <div className="mx-auto max-w-site">
          <h1 className="font-heading text-display-1 font-black uppercase text-surface motion-safe:animate-rise motion-safe:[animation-delay:80ms]">
            {title}
          </h1>
          <p className="mt-6 max-w-2xl text-lead text-on-ink-muted motion-safe:animate-rise motion-safe:[animation-delay:160ms]">
            {description}
          </p>
        </div>
      </section>
      <div
        className={`relative isolate px-4 pb-section sm:px-6 lg:px-8 ${band ? "" : "pt-12 lg:pt-20"}`}
      >
        {band ? (
          <div
            aria-hidden="true"
            data-page-band
            className="absolute inset-x-0 top-0 -z-10 h-32 bg-ink md:h-48 lg:h-60"
          />
        ) : null}
        <div className="mx-auto max-w-site">{children}</div>
      </div>
    </>
  );
}
