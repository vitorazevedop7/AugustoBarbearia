"use client";

import { type ReactNode, useEffect, useRef } from "react";

type Tone = "info" | "success" | "warning" | "danger";

const tones: Record<Tone, { border: string; title: string }> = {
  info: { border: "border-ink", title: "text-ink" },
  success: { border: "border-success", title: "text-success" },
  warning: { border: "border-warning", title: "text-warning" },
  danger: { border: "border-danger", title: "text-danger" },
};

/**
 * Aviso dentro da página. `danger` é anunciado na hora pelo leitor de tela
 * (`role="alert"`); os outros tons esperam a vez (`role="status"`).
 *
 * `revealOnMount` é para o aviso que aparece depois de uma ação (#157): ao
 * surgir, ou ao mudar de texto, ele recebe o foco e entra na tela. `center`
 * serve ao resultado de um formulário, que aparece acima do botão; `top`, ao
 * aviso da página de destino de um redirecionamento (`?aviso=`), que volta ao
 * topo com o cabeçalho à vista.
 */
export function Alert({
  tone = "info",
  title,
  revealOnMount,
  children,
}: {
  tone?: Tone;
  title: string;
  revealOnMount?: "center" | "top";
  children?: ReactNode;
}) {
  const { border, title: titleColor } = tones[tone];
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!revealOnMount || !element) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches;
    if (revealOnMount === "top") {
      window.scrollTo({ top: 0, behavior: "instant" });
    } else {
      element.scrollIntoView({
        block: "center",
        behavior: smooth ? "smooth" : "instant",
      });
    }
    element.focus({ preventScroll: true });
  }, [revealOnMount, title]);

  return (
    <div
      ref={ref}
      role={tone === "danger" ? "alert" : "status"}
      tabIndex={revealOnMount ? -1 : undefined}
      className={`border-l-4 bg-surface p-4 shadow-card outline-none sm:p-5 ${border}`}
    >
      <p className={`font-semibold ${titleColor}`}>{title}</p>
      {children ? (
        <div className="mt-1 text-sm leading-relaxed text-ink-muted">
          {children}
        </div>
      ) : null}
    </div>
  );
}
