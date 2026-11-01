import type { components } from "@/lib/api/schema";

type TimeBlock = components["schemas"]["TimeBlockResponse"];

/** Um bloqueio no formato de `GET /admin/time-blocks`: almoço de terça, 3/11. */
export function timeBlock(changes: Partial<TimeBlock> = {}): TimeBlock {
  return {
    id: 21,
    barber: { id: 1, name: "Edvaldo", active: true },
    starts_at: "2026-11-03T12:00:00-03:00",
    ends_at: "2026-11-03T13:00:00-03:00",
    all_day: false,
    reason: "Almoço",
    ...changes,
  };
}

/** A folga de dia inteiro: da meia-noite à meia-noite seguinte (RN-03). */
export function dayOff(changes: Partial<TimeBlock> = {}): TimeBlock {
  return timeBlock({
    id: 22,
    barber: { id: 2, name: "Lauro", active: true },
    starts_at: "2026-11-03T00:00:00-03:00",
    ends_at: "2026-11-04T00:00:00-03:00",
    all_day: true,
    reason: "Folga",
    ...changes,
  });
}
