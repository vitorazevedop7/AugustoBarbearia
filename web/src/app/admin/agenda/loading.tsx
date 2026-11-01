export default function AgendaLoading() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      aria-busy="true"
      className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8 lg:py-12"
    >
      <p role="status" className="sr-only">
        Carregando a agenda.
      </p>
      <div aria-hidden="true" className="flex flex-col gap-6">
        <div className="h-8 w-32 bg-line motion-safe:animate-pulse" />
        <div className="h-11 max-w-md bg-line motion-safe:animate-pulse" />
        <div className="grid gap-8 lg:grid-cols-3">
          {[0, 1, 2].map((column) => (
            <div key={column} className="flex flex-col gap-3">
              <div className="h-6 w-24 bg-line motion-safe:animate-pulse" />
              <div className="h-20 bg-line motion-safe:animate-pulse" />
              <div className="h-20 bg-line motion-safe:animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
