import { describe, expect, it } from "vitest";
import {
  formatPeriod,
  monthPeriod,
  parseReportParams,
  reportHref,
  shortcuts,
  weekPeriod,
} from "./report-state";

// Terça, 3/11/2026.
const TODAY = "2026-11-03";

describe("estado do relatório na URL — RN-43", () => {
  it("sem parâmetros vale Este mês", () => {
    expect(parseReportParams({}, TODAY)).toEqual({
      inicio: "2026-11-01",
      fim: "2026-11-30",
    });
  });

  it("lê o período e o barbeiro da URL", () => {
    expect(
      parseReportParams(
        { inicio: "2026-10-05", fim: "2026-10-12", barbeiro: "2" },
        TODAY,
      ),
    ).toEqual({ inicio: "2026-10-05", fim: "2026-10-12", barbeiro: 2 });
  });

  it.each([
    [{ inicio: "2026-10-05" }],
    [{ fim: "2026-10-12" }],
    [{ inicio: "2026-13-01", fim: "2026-10-12" }],
    [{ inicio: "05/10/2026", fim: "12/10/2026" }],
  ])("sem as duas datas válidas, vale Este mês: %j", (params) => {
    expect(parseReportParams(params, TODAY)).toEqual({
      inicio: "2026-11-01",
      fim: "2026-11-30",
    });
  });

  it("deixa a API recusar o período invertido e ignora barbeiro inválido", () => {
    expect(
      parseReportParams(
        { inicio: "2026-11-10", fim: "2026-11-01", barbeiro: "abc" },
        TODAY,
      ),
    ).toEqual({ inicio: "2026-11-10", fim: "2026-11-01" });
  });

  it("calcula os atalhos: hoje, a semana de segunda a domingo e o mês", () => {
    expect(shortcuts(TODAY)).toEqual([
      { label: "Hoje", period: { inicio: TODAY, fim: TODAY } },
      {
        label: "Esta semana",
        period: { inicio: "2026-11-02", fim: "2026-11-08" },
      },
      {
        label: "Este mês",
        period: { inicio: "2026-11-01", fim: "2026-11-30" },
      },
    ]);
  });

  it("o domingo ainda é da semana que começou na segunda", () => {
    expect(weekPeriod("2026-11-08")).toEqual({
      inicio: "2026-11-02",
      fim: "2026-11-08",
    });
  });

  it.each([
    ["2026-02-10", "2026-02-28"],
    ["2028-02-10", "2028-02-29"],
    ["2026-12-31", "2026-12-31"],
  ])("o último dia do mês de %s é %s", (date, last) => {
    expect(monthPeriod(date).fim).toBe(last);
  });

  it("monta o link mantendo o barbeiro", () => {
    expect(
      reportHref({ inicio: "2026-11-01", fim: "2026-11-30", barbeiro: 2 }),
    ).toBe("/admin/relatorio?inicio=2026-11-01&fim=2026-11-30&barbeiro=2");
    expect(reportHref({ inicio: "2026-11-01", fim: "2026-11-30" })).toBe(
      "/admin/relatorio?inicio=2026-11-01&fim=2026-11-30",
    );
  });

  it("escreve o período por extenso", () => {
    expect(formatPeriod({ inicio: "2026-11-03", fim: "2026-11-03" })).toBe(
      "03/11/2026",
    );
    expect(formatPeriod({ inicio: "2026-11-01", fim: "2026-11-30" })).toBe(
      "01/11/2026 a 30/11/2026",
    );
  });
});
