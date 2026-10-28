"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Anima a entrada dos elementos com `data-reveal` uma única vez.
 * Só esconde o que está abaixo da dobra na montagem: sem JS, sem suporte a
 * IntersectionObserver ou com pedido de menos movimento, tudo fica visível.
 */
export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
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
            entry.target.setAttribute("data-reveal", "done");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.15 },
    );

    for (const element of document.querySelectorAll("[data-reveal]")) {
      if (element.getBoundingClientRect().top > window.innerHeight) {
        element.setAttribute("data-reveal", "pending");
        observer.observe(element);
      }
    }

    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
