"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Como o cabeçalho aparece. Ele nunca é fixo: rola com a página, como no
 * Beard X, e quem rola o deixa para trás.
 * - `hero`: na página inicial. Transparente no topo do hero, que é escuro,
 *   então ele nunca fica sobre fundo claro.
 * - `bar`: nas outras páginas. Faixa escura no topo, contínua com o
 *   `PageHero` da vitrine.
 */
export type HeaderMode = "hero" | "bar";

const modes: Record<HeaderMode, string> = {
  hero: "absolute bg-transparent",
  bar: "relative bg-ink",
};

/**
 * A moldura do cabeçalho, que decide o modo pela página. Só a página inicial
 * tem o hero de tela inteira por trás do cabeçalho.
 */
export function HeaderFrame({ children }: { children: ReactNode }) {
  const mode: HeaderMode = usePathname() === "/" ? "hero" : "bar";

  return (
    <header
      data-mode={mode}
      className={`${modes[mode]} inset-x-0 top-0 z-40 px-4 text-surface sm:px-6 lg:px-8 transition-colors duration-300 ease-standard has-[[data-mobile-menu][open]]:bg-ink motion-reduce:transition-none`}
    >
      {children}
    </header>
  );
}
