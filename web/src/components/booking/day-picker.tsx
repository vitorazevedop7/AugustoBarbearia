import Link from "next/link";
import { formatLongDate, formatMonth, shortDateParts } from "@/lib/format";
import { optionClasses } from "./option";

/**
 * Escolha do dia: os dias que a API devolveu (só os que têm horário, RN-05 a
 * RN-07), agrupados por mês. Cada dia é um link: um toque avança, sem JS.
 * `hrefFor` diz para onde cada dia leva, para a remarcação (S3.09) poder
 * reaproveitar a mesma tela.
 */
export function DayPicker({
  days,
  hrefFor,
  headingLevel: Heading = "h2",
}: {
  /** Datas `AAAA-MM-DD`, em ordem. */
  days: string[];
  hrefFor: (date: string) => string;
  /** `h3` quando a tela já tem um `h2` acima (ex.: /design-system). */
  headingLevel?: "h2" | "h3";
}) {
  return (
    <div className="flex flex-col gap-8">
      {groupByMonth(days).map(({ month, dates }) => (
        <section key={month} aria-labelledby={`mes-${month}`}>
          <Heading
            id={`mes-${month}`}
            className="text-sm font-semibold text-ink-muted"
          >
            {formatMonth(dates[0])}
          </Heading>
          <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">
            {dates.map((date) => {
              const { weekday, day, month: shortMonth } = shortDateParts(date);
              return (
                <li key={date}>
                  <Link
                    href={hrefFor(date)}
                    className={`${optionClasses} min-h-20 flex-col py-3`}
                  >
                    <span className="sr-only">{formatLongDate(date)}</span>
                    <span aria-hidden="true" className="text-xs font-semibold">
                      {weekday}
                    </span>
                    <span
                      aria-hidden="true"
                      className="font-heading text-2xl leading-tight font-semibold tabular-nums"
                    >
                      {day}
                    </span>
                    <span aria-hidden="true" className="text-xs">
                      {shortMonth}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function groupByMonth(days: string[]) {
  const groups: { month: string; dates: string[] }[] = [];
  for (const date of days) {
    const month = date.slice(0, 7);
    const last = groups.at(-1);
    if (last?.month === month) last.dates.push(date);
    else groups.push({ month, dates: [date] });
  }
  return groups;
}
