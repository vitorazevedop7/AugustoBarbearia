"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";

/**
 * Menu do celular: um `<details>` nativo, que abre e fecha mesmo sem JS. Com
 * JS, fecha com Esc (devolvendo o foco ao botão), ao navegar e ao escolher um
 * link. O painel desce logo abaixo do cabeçalho (o pai precisa ser `relative`)
 * e some a partir de 1024px, onde a navegação fica na linha do cabeçalho.
 */
export function MobileMenu({
  label = "Menu",
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  const details = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (details.current) details.current.open = false;
  }, [pathname]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      const menu = details.current;
      if (event.key !== "Escape" || !menu?.open) return;
      menu.open = false;
      menu.querySelector("summary")?.focus();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, []);

  function closeOnLink(event: MouseEvent<HTMLDivElement>) {
    if (
      event.target instanceof Element &&
      event.target.closest("a") &&
      details.current
    ) {
      details.current.open = false;
    }
  }

  return (
    <details ref={details} className="group lg:hidden">
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 border-2 border-ink px-4 text-xs font-semibold tracking-[0.08em] text-ink uppercase transition-colors duration-300 ease-out hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink motion-reduce:transition-none [&::-webkit-details-marker]:hidden">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            className="group-open:hidden"
            d="M4 7h16M4 12h16M4 17h16"
            strokeLinecap="square"
          />
          <path
            className="hidden group-open:block"
            d="M6 6l12 12M18 6 6 18"
            strokeLinecap="square"
          />
        </svg>
        {label}
      </summary>
      <div
        onClick={closeOnLink}
        className="absolute inset-x-0 top-full max-h-[calc(100dvh-100%)] overflow-y-auto border-b border-line bg-surface shadow-card"
      >
        {children}
      </div>
    </details>
  );
}
