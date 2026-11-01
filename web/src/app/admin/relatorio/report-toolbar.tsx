import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import {
  REPORT_PATH,
  isSamePeriod,
  reportHref,
  shortcuts,
  type ReportState,
} from "./report-state";

type FilterBarber = { id: number; name: string };

/**
 * A barra do relatório: os atalhos de período e o formulário "De", "Até" e
 * "Barbeiro". Tudo é link ou formulário `GET`, então funciona sem JS (RN-43).
 */
export function ReportToolbar({
  state,
  today,
  barbers,
}: {
  state: ReportState;
  today: string;
  barbers: FilterBarber[];
}) {
  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Atalhos de período">
        <ul className="flex flex-wrap gap-2">
          {shortcuts(today).map(({ label, period }) => {
            const current = isSamePeriod(state, period);
            return (
              <li key={label}>
                <Link
                  href={reportHref({ ...period, barbeiro: state.barbeiro })}
                  aria-current={current ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center border px-4 text-sm font-semibold transition-colors duration-300 ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none ${
                    current
                      ? "border-ink bg-ink text-paper"
                      : "border-ink-muted bg-surface text-ink hover:border-ink"
                  }`}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {/* Os campos são não controlados: a `key` recria o formulário quando um
          atalho troca o período por navegação no cliente, senão a data
          digitada antes continuaria na tela. */}
      <form
        key={`${state.inicio}|${state.fim}|${state.barbeiro ?? ""}`}
        method="get"
        action={REPORT_PATH}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,14rem))_auto] lg:items-end"
      >
        <TextField
          type="date"
          name="inicio"
          label="De"
          defaultValue={state.inicio}
        />
        <TextField
          type="date"
          name="fim"
          label="Até"
          defaultValue={state.fim}
        />
        <SelectField
          name="barbeiro"
          label="Barbeiro"
          required={false}
          defaultValue={state.barbeiro === undefined ? "" : state.barbeiro}
        >
          <option value="">Todos</option>
          {barbers.map((barber) => (
            <option key={barber.id} value={barber.id}>
              {barber.name}
            </option>
          ))}
        </SelectField>
        <Button
          type="submit"
          variant="outline"
          size="sm"
          className="min-h-12 sm:col-span-2 lg:col-span-1"
        >
          Ver relatório
        </Button>
      </form>
    </div>
  );
}
