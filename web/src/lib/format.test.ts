import { describe, expect, it } from "vitest";
import {
  formatDuration,
  formatList,
  formatLongDate,
  formatMonth,
  formatPhone,
  formatPrice,
  formatShortDate,
  formatTime,
  localDate,
  shortDateParts,
  toPriceInput,
  toTimeInput,
} from "./format";

describe("formatPhone", () => {
  it.each([
    ["75999990000", "(75) 99999-0000"],
    ["7533334444", "(75) 3333-4444"],
    ["123", "123"],
  ])("formata %s como %s", (digits, expected) => {
    expect(formatPhone(digits)).toBe(expected);
  });
});

describe("toTimeInput", () => {
  it("corta os segundos e trata hora ausente como vazio", () => {
    expect(toTimeInput("09:30:00")).toBe("09:30");
    expect(toTimeInput(null)).toBe("");
  });
});

describe("formatPrice", () => {
  it.each([
    ["25.00", "R$ 25,00"],
    ["0.00", "R$ 0,00"],
    ["1234.5", "R$ 1.234,50"],
    // Além da precisão de um float: a string é formatada sem arredondar.
    ["90071992547409.93", "R$ 90.071.992.547.409,93"],
  ])("formata %s como %s", (value, expected) => {
    expect(formatPrice(value)).toBe(expected);
  });
});

describe("toPriceInput", () => {
  it("troca o ponto pela vírgula e trata preço ausente como vazio", () => {
    expect(toPriceInput("1234.50")).toBe("1234,50");
    expect(toPriceInput(undefined)).toBe("");
  });
});

describe("formatDuration", () => {
  it.each([
    [10, "10 min"],
    [45, "45 min"],
    [60, "1h"],
    [90, "1h 30min"],
    [125, "2h 5min"],
  ])("formata %i minutos como %s", (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected);
  });
});

describe("formatList", () => {
  it("junta os nomes com vírgula e “e”", () => {
    expect(formatList(["Lauro"])).toBe("Lauro");
    expect(formatList(["Edvaldo", "Lauro", "Manoel"])).toBe(
      "Edvaldo, Lauro e Manoel",
    );
  });
});

describe("datas e horas do agendamento — RN-01", () => {
  it("formata o dia do calendário sem depender do fuso de quem formata", () => {
    expect(formatShortDate("2026-11-03")).toBe("Ter, 3 de nov");
    expect(shortDateParts("2026-11-01")).toEqual({
      weekday: "Dom",
      day: "1",
      month: "nov",
    });
    expect(formatLongDate("2026-11-03")).toBe(
      "terça-feira, 3 de novembro de 2026",
    );
    expect(formatMonth("2026-12-02")).toBe("Dezembro de 2026");
  });

  it("mostra a hora e o dia de um instante no fuso de São Paulo", () => {
    expect(formatTime("2026-11-03T10:00:00-03:00")).toBe("10:00");
    expect(formatTime("2026-11-03T13:30:00Z")).toBe("10:30");
    // 1h de 3/11 em UTC ainda é 2/11 em São Paulo.
    expect(localDate("2026-11-03T01:00:00Z")).toBe("2026-11-02");
    expect(localDate("2026-11-03T10:00:00-03:00")).toBe("2026-11-03");
  });
});
