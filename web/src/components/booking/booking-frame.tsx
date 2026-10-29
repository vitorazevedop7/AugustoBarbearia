import Link from "next/link";
import type { ReactNode, Ref } from "react";
import { BOOKING_STEPS, type BookingStep } from "@/lib/booking";

export const STEP_TITLES: Record<BookingStep, string> = {
  barbeiro: "Escolha o barbeiro",
  servico: "Escolha o serviço",
  data: "Escolha o dia",
  hora: "Escolha o horário",
  confirmar: "Confirme o agendamento",
};

/**
 * Moldura das etapas do agendamento e da remarcação (S3.09), compartilhada
 * com o carregamento.
 */
export function BookingMain({
  children,
  busy = false,
}: {
  children: ReactNode;
  busy?: boolean;
}) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      aria-busy={busy || undefined}
      className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:py-12"
    >
      {children}
    </main>
  );
}

/** A posição da etapa num fluxo: "Etapa 2 de 4 · Dia". */
export type StepProgress = { number: number; total: number; label: string };

/** "Etapa 2 de 5 · Serviço" acima do título, sem barra de progresso. */
export function StepHeader({
  progress,
  title,
  headingRef,
}: {
  /** Sem etapa (ex.: depois de confirmar), só o título aparece. */
  progress?: StepProgress;
  title: string;
  headingRef?: Ref<HTMLHeadingElement>;
}) {
  return (
    <header>
      {progress ? (
        <p className="text-xs font-semibold tracking-[0.08em] text-ink-muted uppercase">
          Etapa {progress.number} de {progress.total} · {progress.label}
        </p>
      ) : null}
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="mt-2 font-heading text-display-3 font-bold text-ink focus:outline-none"
      >
        {title}
      </h1>
    </header>
  );
}

/** O cabeçalho das etapas de `/agendar`. */
export function BookingHeader({
  step,
  title,
  headingRef,
}: {
  step?: BookingStep;
  title?: string;
  headingRef?: Ref<HTMLHeadingElement>;
}) {
  const index = BOOKING_STEPS.findIndex((item) => item.step === step);
  return (
    <StepHeader
      progress={
        index >= 0
          ? {
              number: index + 1,
              total: BOOKING_STEPS.length,
              label: BOOKING_STEPS[index].label,
            }
          : undefined
      }
      title={title ?? (step ? STEP_TITLES[step] : "")}
      headingRef={headingRef}
    />
  );
}

export type SummaryItem = {
  label: string;
  value: ReactNode;
  /** Destino do "Trocar": a etapa desta escolha, sem as que dependem dela. */
  changeHref?: string;
};

/** As escolhas já feitas, cada uma com o link "Trocar". */
export function ChoiceSummary({ items }: { items: SummaryItem[] }) {
  if (items.length === 0) return null;
  return (
    <dl className="mt-6 divide-y divide-line bg-surface px-4 shadow-card sm:px-6">
      {items.map(({ label, value, changeHref }) => (
        <div key={label} className="flex items-center gap-4 py-3">
          <dt className="w-20 shrink-0 text-xs font-semibold tracking-[0.08em] text-ink-muted uppercase">
            {label}
          </dt>
          <dd className="min-w-0 flex-1 text-ink">{value}</dd>
          {changeHref ? (
            <dd className="shrink-0">
              <Link
                href={changeHref}
                className="inline-flex min-h-11 items-center text-sm font-semibold text-brand underline underline-offset-4 transition-colors duration-300 ease-out hover:text-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none"
              >
                Trocar <span className="sr-only">{label.toLowerCase()}</span>
              </Link>
            </dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}
