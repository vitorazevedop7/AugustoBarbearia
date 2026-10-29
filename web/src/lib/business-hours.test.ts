import { describe, expect, it } from "vitest";
import { formatHour, groupBusinessHours } from "./business-hours";

type Hours = [string | null, string | null];

/** Semana padrão da RN-02, com os dias trocados por `overrides`. */
function week(overrides: Record<number, Hours> = {}) {
  return [0, 1, 2, 3, 4, 5, 6].map((weekday) => {
    const standard: Hours =
      weekday < 5
        ? ["10:00:00", "19:00:00"]
        : weekday === 5
          ? ["09:00:00", "14:00:00"]
          : [null, null];
    const [opens_at, closes_at] = overrides[weekday] ?? standard;
    return { weekday, opens_at, closes_at };
  });
}

describe("formatHour", () => {
  it("fala a hora sem zero à esquerda e sem minutos redondos", () => {
    expect(formatHour("09:00:00")).toBe("9h");
    expect(formatHour("19:00:00")).toBe("19h");
    expect(formatHour("10:30:00")).toBe("10h30");
  });
});

describe("groupBusinessHours", () => {
  it("RN-02: junta os dias seguidos com o mesmo horário", () => {
    expect(groupBusinessHours(week())).toEqual([
      { days: "Segunda a sexta", hours: "10h às 19h" },
      { days: "Sábado", hours: "9h às 14h" },
      { days: "Domingo", hours: "Fechado" },
    ]);
  });

  it("usa “e” para dois dias e separa os que não são seguidos", () => {
    expect(
      groupBusinessHours(
        week({
          0: [null, null],
          2: ["10:00:00", "18:30:00"],
          5: [null, null],
        }),
      ),
    ).toEqual([
      { days: "Segunda", hours: "Fechado" },
      { days: "Terça", hours: "10h às 19h" },
      { days: "Quarta", hours: "10h às 18h30" },
      { days: "Quinta e sexta", hours: "10h às 19h" },
      { days: "Sábado e domingo", hours: "Fechado" },
    ]);
  });

  it("ordena os dias pela semana", () => {
    expect(groupBusinessHours(week().reverse())[0]).toEqual({
      days: "Segunda a sexta",
      hours: "10h às 19h",
    });
  });
});
