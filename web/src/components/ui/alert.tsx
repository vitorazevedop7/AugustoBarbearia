import type { ReactNode } from "react";

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
 */
export function Alert({
  tone = "info",
  title,
  children,
}: {
  tone?: Tone;
  title: string;
  children?: ReactNode;
}) {
  const { border, title: titleColor } = tones[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={`border-l-4 bg-surface p-4 shadow-card sm:p-5 ${border}`}
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
