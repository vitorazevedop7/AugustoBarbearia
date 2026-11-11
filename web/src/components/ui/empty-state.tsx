import type { ReactNode } from "react";
import { Ornament } from "./ornament";

/**
 * Lista ou busca sem resultado: diz o que aconteceu e qual é o próximo passo.
 * O fundo `surface` o mantém legível também sobre a faixa escura parcial das
 * páginas internas.
 */
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
    <div className="flex flex-col items-center border border-dashed border-ink-muted bg-surface px-6 py-12 text-center">
      <Ornament />
      <p className="mt-6 font-heading text-display-4 font-normal text-ink">
        {title}
      </p>
      {description ? (
        <p className="mt-2 max-w-sm text-ink-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
