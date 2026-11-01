import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { formatLongDate, localDate } from "@/lib/format";
import { AdminPage } from "../../../../admin-page";
import {
  agendaHref,
  parseAgendaParams,
  todayInSaoPaulo,
} from "../../../agenda-state";
import type { Loaded } from "../../../data";
import { loadTimeBlock } from "../../data";
import { RemoveTimeBlockForm } from "../../remove-form";
import {
  backFields,
  timeBlockId,
  timeBlockNotFoundMessage,
  timeBlockTime,
  type TimeBlock,
} from "../../time-block-state";

export const metadata: Metadata = {
  title: "Remover bloqueio — Administração — Augusto Barbearia",
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-ink-muted">{label}</dt>
      <dd className="min-w-0 text-ink wrap-anywhere">{children}</dd>
    </>
  );
}

/**
 * Confirmação de "Remover" (padrão "Confirmação destrutiva"). É uma página, e
 * não um `<dialog>`, para funcionar sem JS. Os horários voltam a ser
 * oferecidos assim que o bloqueio sai (RN-05).
 */
export default async function RemoveTimeBlockPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const id = timeBlockId((await params).id);
  const state = parseAgendaParams(await searchParams, todayInSaoPaulo());
  const back = (
    <ButtonLink
      href={agendaHref(state)}
      variant="ghost"
      size="sm"
      className="w-full sm:w-auto"
    >
      Voltar
    </ButtonLink>
  );
  // Tipo explícito: sem ele, o TypeScript pode reduzir a união e perder `data`.
  const loaded: Loaded<TimeBlock> =
    id === null
      ? { message: timeBlockNotFoundMessage }
      : await loadTimeBlock(id);

  if (!loaded.data) {
    return (
      <AdminPage title="Remover bloqueio">
        <div className="flex flex-col gap-6">
          <Alert tone="danger" title={loaded.message} />
          <div>{back}</div>
        </div>
      </AdminPage>
    );
  }

  const block = loaded.data;
  return (
    <AdminPage title="Remover bloqueio">
      <div className="flex max-w-2xl flex-col gap-6">
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 bg-surface p-6 text-sm shadow-card">
          <Row label="Barbeiro">{block.barber.name}</Row>
          <Row label="Dia">{formatLongDate(localDate(block.starts_at))}</Row>
          <Row label="Horário">
            <span className="tabular-nums">{timeBlockTime(block)}</span>
          </Row>
          <Row label="Motivo">{block.reason ?? "Não informado"}</Row>
        </dl>
        <Alert
          tone="info"
          title="Os horários voltam a ficar disponíveis para agendamento."
        />
        <RemoveTimeBlockForm
          fields={{ block_id: String(block.id), ...backFields(state) }}
          back={back}
        />
      </div>
    </AdminPage>
  );
}
