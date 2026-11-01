import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  timeBlockSummary,
  timeBlockTime,
  type TimeBlock,
} from "./time-block-state";

const textLink =
  "inline-flex min-h-11 items-center self-start text-sm font-semibold text-brand underline underline-offset-4 transition-colors duration-300 ease-standard hover:text-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none";

/** Um bloqueio: o horário (ou "Dia inteiro"), o motivo e o link "Remover". */
function TimeBlockItem({
  block,
  removeHref,
  showBarber,
}: {
  block: TimeBlock;
  removeHref: string;
  showBarber: boolean;
}) {
  return (
    <li className="flex flex-col gap-1 border border-dashed border-ink-muted p-3">
      <span className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-ink tabular-nums">
          {timeBlockTime(block)}
        </span>
        <Badge tone="muted">Bloqueado</Badge>
      </span>
      {block.reason ? (
        <span className="text-ink wrap-anywhere">{block.reason}</span>
      ) : null}
      {showBarber ? (
        <span className="text-sm text-ink-muted">{block.barber.name}</span>
      ) : null}
      {/* O nome acessível começa pelo texto visível ("Remover") e diz qual. */}
      <Link
        href={removeHref}
        aria-label={`Remover o bloqueio de ${timeBlockSummary(block)}`}
        className={textLink}
      >
        Remover
      </Link>
    </li>
  );
}

/**
 * Os bloqueios de um barbeiro num dia, ou de um dia na semana (RN-03). Entra
 * depois dos agendamentos, pelos pontos de extensão da agenda. Sem bloqueios,
 * não mostra nada.
 */
export function TimeBlockList({
  blocks,
  removeHrefFor,
  showBarber = false,
}: {
  blocks: TimeBlock[];
  removeHrefFor: (block: TimeBlock) => string;
  /** Na semana com todos os barbeiros, cada bloqueio diz de quem é. */
  showBarber?: boolean;
}) {
  if (blocks.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-sm font-semibold text-ink-muted">Bloqueios</h4>
      <ul className="flex flex-col gap-3">
        {blocks.map((block) => (
          <TimeBlockItem
            key={block.id}
            block={block}
            removeHref={removeHrefFor(block)}
            showBarber={showBarber}
          />
        ))}
      </ul>
    </div>
  );
}
