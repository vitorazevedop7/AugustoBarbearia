export default function AdminLoading() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      aria-busy="true"
      className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8 lg:py-12"
    >
      <h1 className="text-2xl font-semibold text-ink">Administração</h1>
      <p role="status" className="sr-only">
        Verificando seu acesso.
      </p>
      <div
        aria-hidden="true"
        className="mt-6 h-16 max-w-2xl bg-line motion-safe:animate-pulse"
      />
    </main>
  );
}
