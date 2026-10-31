"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";

/**
 * Menu do celular: um `<details>` nativo, que abre e fecha mesmo sem JS. Com
 * JS, fecha com Esc (devolvendo o foco ao botão), ao navegar e ao escolher um
 * link. O painel escuro desce de trás do cabeçalho (o pai precisa estar
 * posicionado), ocupa o resto da tela e some a partir de 1024px, onde a
 * navegação fica na linha do cabeçalho. Enquanto ele está aberto, o
 * `globals.css` trava a rolagem da página pelo `data-mobile-menu`, sem JS.
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
    <details ref={details} data-mobile-menu className="group lg:hidden">
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 border-2 border-surface px-4 text-xs font-semibold tracking-[0.08em] text-surface uppercase transition-colors duration-300 ease-standard hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-surface motion-reduce:transition-none [&::-webkit-details-marker]:hidden">
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
      {/* A moldura recorta o painel enquanto ele desce: nada passa por cima
          do cabeçalho. A animação só vale com o menu aberto, para recomeçar
          a cada abertura. */}
      <div className="absolute inset-x-0 top-full h-[calc(100dvh-100%)] overflow-hidden">
        <div
          onClick={closeOnLink}
          className="h-full overflow-y-auto overscroll-contain border-t border-line-on-ink bg-ink text-surface motion-safe:group-open:animate-menu-down"
        >
          {children}
        </div>
      </div>
    </details>
  );
}
