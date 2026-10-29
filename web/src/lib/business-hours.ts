/** Um dia do horário de funcionamento, como a API devolve (0 = segunda … 6 = domingo). */
export type BusinessDay = {
  weekday: number;
  opens_at?: string | null;
  closes_at?: string | null;
};

export type BusinessHoursLine = { days: string; hours: string };

const WEEKDAYS = [
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
  "domingo",
];

/** Hora da API ("09:00:00", "10:30:00") como se fala: "9h", "10h30". */
export function formatHour(value: string): string {
  const [hours, minutes] = value.split(":");
  const hour = String(Number(hours));
  return minutes && minutes !== "00" ? `${hour}h${minutes}` : `${hour}h`;
}

function hoursLabel(day: BusinessDay): string {
  return day.opens_at && day.closes_at
    ? `${formatHour(day.opens_at)} às ${formatHour(day.closes_at)}`
    : "Fechado";
}

function daysLabel(first: number, last: number): string {
  const start = WEEKDAYS[first];
  const label =
    first === last
      ? start
      : last === first + 1
        ? `${start} e ${WEEKDAYS[last]}`
        : `${start} a ${WEEKDAYS[last]}`;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Horário de funcionamento para exibir, juntando os dias seguidos com o mesmo
 * horário: "Segunda a sexta" 10h às 19h, "Sábado" 9h às 14h, "Domingo"
 * fechado. Só formata: quem decide o horário é a API (RN-02).
 */
export function groupBusinessHours(days: BusinessDay[]): BusinessHoursLine[] {
  const sorted = [...days].sort((a, b) => a.weekday - b.weekday);
  const lines: { first: number; last: number; hours: string }[] = [];
  for (const day of sorted) {
    const hours = hoursLabel(day);
    const previous = lines.at(-1);
    if (
      previous &&
      previous.hours === hours &&
      previous.last === day.weekday - 1
    ) {
      previous.last = day.weekday;
    } else {
      lines.push({ first: day.weekday, last: day.weekday, hours });
    }
  }
  return lines.map(({ first, last, hours }) => ({
    days: daysLabel(first, last),
    hours,
  }));
}
