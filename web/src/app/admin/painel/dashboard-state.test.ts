import { describe, expect, it } from "vitest";
import { filledDashboard } from "@/test/dashboard-data";
import {
  CHART_HEIGHT,
  busiestSlot,
  changeView,
  formatDayRange,
  formatPercent,
  heatLevel,
  revenueBars,
  trendOf,
  visiblePeakRows,
} from "./dashboard-state";

describe("painel — contas de exibição (RN-45)", () => {
  it("formata o percentual da API sem passar por número", () => {
    expect(formatPercent("33.3")).toBe("33,3%");
    expect(formatPercent("0.0")).toBe("0,0%");
    expect(formatPercent("1234.5")).toBe("1.234,5%");
  });

  it("formata o trecho de dias no mesmo mês e entre meses", () => {
    expect(formatDayRange("2026-11-01", "2026-11-18")).toBe("1 a 18 de nov");
    expect(formatDayRange("2026-10-20", "2026-11-18")).toBe(
      "20 de out a 18 de nov",
    );
    expect(formatDayRange("2026-11-18", "2026-11-18")).toBe("18 de nov");
  });

  it("lê o sentido da variação pela string", () => {
    expect(trendOf("21.0")).toBe("up");
    expect(trendOf("-5.5")).toBe("down");
    expect(trendOf("0.0")).toBe("flat");
    expect(trendOf("-0.0")).toBe("flat");
    expect(trendOf(null)).toBe("none");
  });

  it("variação: a seta e o texto dizem o sentido, a cor segue o que é bom", () => {
    expect(changeView("21.0")).toEqual({
      trend: "up",
      text: "21,0%",
      label: "Alta de 21,0%",
      tone: "success",
    });
    expect(changeView("-5.5")).toMatchObject({
      label: "Queda de 5,5%",
      tone: "danger",
    });
    // Faltas: subir é ruim, e a unidade é ponto percentual.
    expect(
      changeView("3.0", { unit: "points", higherIsBetter: false }),
    ).toEqual({
      trend: "up",
      text: "3,0 p.p.",
      label: "Alta de 3,0 p.p.",
      tone: "danger",
    });
    expect(changeView("0.0")).toMatchObject({
      label: "Estável",
      tone: "muted",
    });
    expect(changeView(null)).toMatchObject({
      text: "Sem base",
      label: "Sem base de comparação",
    });
  });

  it("as barras crescem até o maior dia e o dia vazio fica com um traço", () => {
    const { bars, peak } = revenueBars(filledDashboard().daily_revenue);

    expect(bars).toHaveLength(30);
    expect(peak?.date).toBe("2026-11-10");
    const tallest = bars.find((bar) => bar.date === "2026-11-10");
    const today = bars.at(-1);
    const empty = bars[0];
    expect(tallest?.y).toBe(8);
    expect((tallest?.y ?? 0) + (tallest?.height ?? 0)).toBe(CHART_HEIGHT);
    // 35 de 75: menos da metade da altura útil.
    expect(today?.height).toBeCloseTo((35 / 75) * 112);
    expect(empty).toMatchObject({ empty: true, height: 1 });
    // Barras lado a lado, sem se encostar.
    expect((bars[1]?.x ?? 0) - (bars[0]?.x ?? 0)).toBeGreaterThan(
      bars[0]?.width ?? 0,
    );
  });

  it("sem faturamento não há melhor dia e nada divide por zero", () => {
    const days = filledDashboard().daily_revenue.map((day) => ({
      ...day,
      revenue: "0.00",
    }));
    const { bars, peak } = revenueBars(days);
    expect(peak).toBeUndefined();
    expect(bars.every((bar) => bar.empty && bar.height === 1)).toBe(true);
  });

  it("o mapa de calor tem 5 níveis, e o máximo é o mais forte", () => {
    expect(heatLevel(0, 4)).toBe(0);
    expect(heatLevel(1, 4)).toBe(1);
    expect(heatLevel(2, 4)).toBe(2);
    expect(heatLevel(3, 4)).toBe(3);
    expect(heatLevel(4, 4)).toBe(4);
    expect(heatLevel(1, 100)).toBe(1);
    expect(heatLevel(3, 0)).toBe(0);
  });

  it("esconde o dia fechado sem atendimento e acha o horário mais cheio", () => {
    const peak = filledDashboard().peak_hours;
    expect(visiblePeakRows(peak).map((row) => row.weekday)).toEqual([
      0, 1, 2, 3, 4, 5,
    ]);
    expect(busiestSlot(peak)).toEqual({ weekday: 1, hour: 10, count: 4 });
    expect(busiestSlot({ ...peak, max_count: 0 })).toBeUndefined();

    const sunday = {
      ...peak,
      rows: peak.rows.map((row) =>
        row.weekday === 6 ? { ...row, counts: row.counts.map(() => 1) } : row,
      ),
    };
    expect(visiblePeakRows(sunday)).toHaveLength(7);
  });
});
