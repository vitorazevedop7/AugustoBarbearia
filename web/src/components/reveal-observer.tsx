"use client";

import { useEffect } from "react";

/**
 * Anima a entrada dos elementos com `data-reveal` uma única vez.
 *
 * O preset vai no próprio `data-reveal`: `rise` (sobe 10% da altura do
 * elemento; também vale sem valor ou com outro valor), `fade` (só aparece) ou
 * `zoom` (de 0,92 a 1 de escala). O atraso vem de `data-reveal-delay`, em
 * milissegundos (padrão de 200ms, definido no CSS). O estado fica em
 * `data-reveal-state`, que o servidor nunca renderiza: `pending` (escondido)
 * e `done` (já apareceu). As regras visuais estão em `globals.css`.
 *
 * Só esconde o que está abaixo da dobra na montagem: sem JS, sem suporte a
 * IntersectionObserver ou com pedido de menos movimento, tudo fica visível.
 *
 * Fica na própria página, não no layout: a página chega por streaming (tem
 * `loading.tsx`), e só depois que ela hidrata o efeito pode gravar o estado
 * sem divergir do HTML do servidor (#69).
 */
export function RevealObserver() {
  useEffect(() => {
    // O CSS só esconde o pendente sob `.js`: sem script, nada some.
    document.documentElement.classList.add("js");
    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-reveal-state", "done");
            observer.unobserve(entry.target);
          }
        }
      },
      // Antecipa a entrada sem depender da altura do card. Os 96px também
      // compensam o deslocamento inicial do preset rise nos cards altos.
      { rootMargin: "0px 0px 96px 0px", threshold: 0 },
    );

    for (const element of document.querySelectorAll<HTMLElement>(
      "[data-reveal]",
    )) {
      if (element.getBoundingClientRect().top > window.innerHeight) {
        const delay = element.dataset.revealDelay;
        if (delay !== undefined && delay !== "") {
          element.style.setProperty("--reveal-delay", `${delay}ms`);
        }
        element.setAttribute("data-reveal-state", "pending");
        observer.observe(element);
      }
    }

    return () => observer.disconnect();
  }, []);

  return null;
}
