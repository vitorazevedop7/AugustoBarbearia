/** Esqueleto das páginas da vitrine: a faixa escura do topo e uma grade de cards. */
export function VitrineSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <main id="main-content" tabIndex={-1} aria-busy="true" className="flex-1">
      <p role="status" className="sr-only">
        Carregando.
      </p>
      <div aria-hidden="true">
        <div className="bg-ink px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="h-3.5 w-32 bg-line-on-ink" />
            <div className="h-12 w-64 max-w-full bg-line-on-ink motion-safe:animate-pulse" />
            <div className="h-5 w-96 max-w-full bg-line-on-ink" />
          </div>
        </div>
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-20 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 lg:px-8">
          {Array.from({ length: cards }, (_, index) => (
            <div
              key={index}
              className="h-64 bg-line motion-safe:animate-pulse"
            />
          ))}
        </div>
      </div>
    </main>
  );
}
