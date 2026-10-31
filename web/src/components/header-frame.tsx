"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Como o cabeçalho aparece:
 * - `hero`: na página inicial, antes do JS. Transparente no topo do hero e
 *   rola com a página, como no Beard X. É o HTML do servidor, então funciona
 *   sem JS: o hero é escuro e o cabeçalho nunca fica sobre fundo claro.
 * - `floating`: na página inicial, com JS, no topo da página. Fixo e ainda
 *   transparente sobre o hero.
 * - `pinned`: na página inicial, assim que a página rola. Faixa escura fixa,
 *   para o "Agendar" continuar à mão. Transparente, ele cobriria o título e
 *   os botões do hero que passam por baixo dele.
 * - `bar`: nas outras páginas. Faixa escura presa no topo, contínua com o
 *   `PageHero` da vitrine.
 */
export type HeaderMode = "hero" | "floating" | "pinned" | "bar";

const modes: Record<HeaderMode, string> = {
  hero: "absolute bg-transparent",
  floating: "fixed bg-transparent",
  pinned: "fixed bg-ink",
  bar: "sticky bg-ink",
};

/**
 * A moldura do cabeçalho, que decide o modo pela página e pela rolagem. Só a
 * página inicial tem o hero de tela inteira por trás do cabeçalho.
 */
export function HeaderFrame({ children }: { children: ReactNode }) {
  const overHero = usePathname() === "/";
  // `null` até o primeiro quadro com JS: o modo `hero` do HTML do servidor.
  const [scrolled, setScrolled] = useState<boolean | null>(null);

  useEffect(() => {
    if (!overHero) return;
    let frame = 0;
    function update() {
      frame = 0;
      setScrolled(window.scrollY > 0);
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(update);
    }
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      // De volta à página inicial, recomeça no topo do hero.
      setScrolled(null);
    };
  }, [overHero]);

  const mode: HeaderMode = !overHero
    ? "bar"
    : scrolled === null
      ? "hero"
      : scrolled
        ? "pinned"
        : "floating";

  return (
    <header
      data-mode={mode}
      className={`${modes[mode]} inset-x-0 top-0 z-40 px-4 text-surface sm:px-6 lg:px-8 transition-colors duration-300 ease-standard has-[[data-mobile-menu][open]]:bg-ink motion-reduce:transition-none`}
    >
      {children}
    </header>
  );
}
