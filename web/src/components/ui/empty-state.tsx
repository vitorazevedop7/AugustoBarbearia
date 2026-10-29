import type { ReactNode } from "react";
import { Ornament } from "./ornament";

/** Lista ou busca sem resultado: diz o que aconteceu e qual é o próximo passo. */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center border border-dashed border-ink-muted px-6 py-12 text-center">
      <Ornament />
      <p className="mt-6 font-heading text-xl font-bold text-ink">{title}</p>
      {description ? (
        <p className="mt-2 max-w-sm text-ink-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
