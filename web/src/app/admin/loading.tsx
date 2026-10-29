export default function AdminLoading() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      aria-busy="true"
      className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8 lg:py-12"
    >
      <p role="status" className="sr-only">
        Carregando.
      </p>
      <div aria-hidden="true" className="space-y-6">
        <div className="h-8 w-48 bg-line motion-safe:animate-pulse" />
        <div className="h-32 max-w-2xl bg-line motion-safe:animate-pulse" />
      </div>
    </main>
  );
}
