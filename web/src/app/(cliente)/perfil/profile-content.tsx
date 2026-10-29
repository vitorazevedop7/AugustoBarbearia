import type { ReactNode } from "react";

/** Moldura da página de perfil, compartilhada com o carregamento. */
export function ProfileContent({
  children,
  busy = false,
}: {
  children: ReactNode;
  busy?: boolean;
}) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      aria-busy={busy || undefined}
      className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 lg:py-12"
    >
      <h1 className="font-heading text-display-3 font-bold text-ink">
        Meu perfil
      </h1>
      <p className="mt-3 text-ink-muted">
        A barbearia usa seu telefone para falar com você sobre os seus horários.
        Ele é necessário para agendar.
      </p>
      <div className="mt-8">{children}</div>
    </main>
  );
}
