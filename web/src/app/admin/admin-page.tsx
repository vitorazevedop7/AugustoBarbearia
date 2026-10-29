import type { ReactNode } from "react";

/** Moldura das páginas da administração: `main`, título em Inter e conteúdo. */
export function AdminPage({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8 lg:py-12"
    >
      <h1 className="text-2xl font-semibold text-ink">{title}</h1>
      {description ? (
        <p className="mt-2 max-w-2xl text-ink-muted">{description}</p>
      ) : null}
      <div className="mt-6">{children}</div>
    </main>
  );
}
