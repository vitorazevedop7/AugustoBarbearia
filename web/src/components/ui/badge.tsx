import type { ReactNode } from "react";

type Tone = "neutral" | "muted" | "brand" | "success" | "warning" | "danger";

const tones: Record<Tone, string> = {
  neutral: "bg-line text-ink",
  muted: "bg-line text-ink-muted",
  brand: "bg-brand text-surface",
  success: "bg-success text-surface",
  warning: "bg-warning text-surface",
  danger: "bg-danger text-surface",
};

/** Etiqueta curta em caixa alta. A cor nunca é a única informação: o texto diz o estado. */
export function Badge({
  tone = "neutral",
  className = "",
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold tracking-[0.08em] uppercase ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Valores do código (glossário em docs/dominio/modelo.md). Virão do contrato gerado da API. */
export type AppointmentStatus =
  "SCHEDULED" | "COMPLETED" | "CANCELED" | "NO_SHOW";

const statuses: Record<
  AppointmentStatus,
  { label: string; tone: Tone; className?: string }
> = {
  SCHEDULED: { label: "Agendado", tone: "neutral" },
  COMPLETED: { label: "Concluído", tone: "success" },
  CANCELED: { label: "Cancelado", tone: "muted", className: "line-through" },
  NO_SHOW: { label: "Faltou", tone: "danger" },
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const { label, tone, className } = statuses[status];
  return (
    <Badge tone={tone} className={className}>
      {label}
    </Badge>
  );
}
