import Link from "next/link";
import type { ReactNode } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import {
  AGENDA_PATH,
  agendaHref,
  shiftAgenda,
  type AgendaState,
} from "./agenda-state";

type FilterBarber = { id: number; name: string };

/** Link de uma escolha da barra (visão, barbeiro); o atual tem `aria-current`. */
function SegmentLink({
  href,
  current,
  children,
}: {
  href: string;
  current: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`inline-flex min-h-11 items-center border px-4 text-sm font-semibold transition-colors duration-300 ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none ${
        current
          ? "border-ink bg-ink text-paper"
          : "border-ink-muted bg-surface text-ink hover:border-ink"
      }`}
    >
      {children}
    </Link>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap gap-2">{children}</ul>
    </nav>
  );
}

/**
 * A barra da agenda: anterior / hoje / próximo, dia ou semana, o barbeiro e
 * um dia qualquer. Tudo é link ou formulário `GET`, então funciona sem JS.
 * `actions` é o lugar de "Novo agendamento" e "Bloquear horário" (S5.04, S5.05).
 */
export function AgendaToolbar({
  state,
  today,
  barbers,
  actions,
}: {
  state: AgendaState;
  today: string;
  barbers: FilterBarber[];
  actions?: ReactNode;
}) {
  const unit = state.visao === "semana" ? "semana" : "dia";
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Group label="Período">
          <li>
            <ButtonLink
              href={agendaHref(shiftAgenda(state, -1))}
              variant="outline"
              size="sm"
            >
              Anterior <span className="sr-only">{unit}</span>
            </ButtonLink>
          </li>
          <li>
            <ButtonLink
              href={agendaHref({ ...state, data: today })}
              variant="outline"
              size="sm"
            >
              Hoje
            </ButtonLink>
          </li>
          <li>
            <ButtonLink
              href={agendaHref(shiftAgenda(state, 1))}
              variant="outline"
              size="sm"
            >
              Próximo <span className="sr-only">{unit}</span>
            </ButtonLink>
          </li>
        </Group>
        <Group label="Visão">
          <li>
            <SegmentLink
              href={agendaHref({ ...state, visao: "dia" })}
              current={state.visao === "dia"}
            >
              Dia
            </SegmentLink>
          </li>
          <li>
            <SegmentLink
              href={agendaHref({ ...state, visao: "semana" })}
              current={state.visao === "semana"}
            >
              Semana
            </SegmentLink>
          </li>
        </Group>
      </div>
      <Group label="Barbeiro">
        <li>
          <SegmentLink
            href={agendaHref({ data: state.data, visao: state.visao })}
            current={state.barbeiro === undefined}
          >
            Todos
          </SegmentLink>
        </li>
        {barbers.map((barber) => (
          <li key={barber.id}>
            <SegmentLink
              href={agendaHref({ ...state, barbeiro: barber.id })}
              current={state.barbeiro === barber.id}
            >
              {barber.name}
            </SegmentLink>
          </li>
        ))}
      </Group>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        {/* O campo é não controlado: a `key` recria o formulário quando
            Anterior, Hoje ou Próximo trocam o dia por navegação no cliente,
            senão a data digitada e não enviada continuaria na tela (#153). */}
        <form
          key={state.data}
          method="get"
          action={AGENDA_PATH}
          className="flex items-end gap-3"
        >
          <div className="w-44">
            <TextField
              type="date"
              name="data"
              label="Ir para a data"
              defaultValue={state.data}
              required
            />
          </div>
          {state.visao === "semana" ? (
            <input type="hidden" name="visao" value="semana" />
          ) : null}
          {state.barbeiro !== undefined ? (
            <input type="hidden" name="barbeiro" value={state.barbeiro} />
          ) : null}
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="min-h-12"
          >
            Ir
          </Button>
        </form>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}
