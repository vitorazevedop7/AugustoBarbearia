import { describe, expect, it } from "vitest";
import {
  addDays,
  agendaHref,
  agendaPeriod,
  appointmentHref,
  appointmentId,
  canceledAhead,
  formatWeekRange,
  openingLabel,
  parseAgendaParams,
  shiftAgenda,
  todayInSaoPaulo,
  weekStart,
} from "./agenda-state";

const TODAY = "2026-11-03";

describe("estado da agenda na URL", () => {
  it("sem parâmetros, é o dia de hoje com todos os barbeiros", () => {
    expect(parseAgendaParams({}, TODAY)).toEqual({
      data: TODAY,
      visao: "dia",
    });
  });

  it("lê data, visão e barbeiro", () => {
    expect(
      parseAgendaParams(
        { data: "2026-12-31", visao: "semana", barbeiro: "2" },
        TODAY,
      ),
    ).toEqual({ data: "2026-12-31", visao: "semana", barbeiro: 2 });
  });

  it.each([
    [{ data: "2026-13-01" }],
    [{ data: "2026-02-30" }],
    [{ data: "03/11/2026" }],
    [{ data: ["2026-11-04", "2026-11-05"] }],
    [{ visao: "mes" }],
    [{ barbeiro: "0" }],
    [{ barbeiro: "abc" }],
  ])("ignora valores inválidos: %j", (params) => {
    expect(parseAgendaParams(params, TODAY)).toEqual({
      data: TODAY,
      visao: "dia",
    });
  });

  it("monta os links sem os valores padrão", () => {
    expect(agendaHref({ data: TODAY, visao: "dia" })).toBe(
      "/admin/agenda?data=2026-11-03",
    );
    expect(agendaHref({ data: TODAY, visao: "semana", barbeiro: 3 })).toBe(
      "/admin/agenda?data=2026-11-03&visao=semana&barbeiro=3",
    );
    expect(appointmentHref(9, { data: TODAY, visao: "dia", barbeiro: 1 })).toBe(
      "/admin/agenda/9?data=2026-11-03&barbeiro=1",
    );
  });

  it("anterior e próximo andam um dia ou uma semana", () => {
    expect(shiftAgenda({ data: TODAY, visao: "dia" }, 1).data).toBe(
      "2026-11-04",
    );
    expect(shiftAgenda({ data: "2026-11-01", visao: "dia" }, -1).data).toBe(
      "2026-10-31",
    );
    expect(
      shiftAgenda({ data: TODAY, visao: "semana", barbeiro: 2 }, -1),
    ).toEqual({ data: "2026-10-27", visao: "semana", barbeiro: 2 });
  });

  it("a semana vai de segunda a domingo", () => {
    expect(weekStart("2026-11-02")).toBe("2026-11-02");
    expect(weekStart("2026-11-05")).toBe("2026-11-02");
    expect(weekStart("2026-11-08")).toBe("2026-11-02");
    expect(agendaPeriod({ data: "2026-11-08", visao: "semana" })).toEqual({
      start: "2026-11-02",
      end: "2026-11-08",
    });
    expect(agendaPeriod({ data: TODAY, visao: "dia" })).toEqual({
      start: TODAY,
      end: TODAY,
    });
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("hoje é o dia de São Paulo (RN-01)", () => {
    // 01h30 UTC de quarta ainda é 22h30 de terça em São Paulo.
    expect(todayInSaoPaulo(new Date("2026-11-04T01:30:00Z"))).toBe(
      "2026-11-03",
    );
    expect(todayInSaoPaulo(new Date("2026-11-04T03:00:00Z"))).toBe(
      "2026-11-04",
    );
  });

  it("formata a semana e o horário de funcionamento (RN-02)", () => {
    expect(formatWeekRange("2026-11-02", "2026-11-08")).toBe(
      "Semana de 2 a 8 de nov",
    );
    expect(formatWeekRange("2026-11-30", "2026-12-06")).toBe(
      "Semana de 30 de nov a 6 de dez",
    );
    expect(
      openingLabel({
        date: TODAY,
        opens_at: "10:00:00",
        closes_at: "19:00:00",
      }),
    ).toBe("10:00 às 19:00");
    expect(openingLabel({ date: TODAY, opens_at: null, closes_at: null })).toBe(
      "Fechado",
    );
  });

  it("só aceita id positivo", () => {
    expect(appointmentId("12")).toBe(12);
    expect(appointmentId("0")).toBeNull();
    expect(appointmentId("1e3")).toBeNull();
  });
});

describe("quanto antes o cliente cancelou (RN-33)", () => {
  it.each([
    ["2026-11-03T13:30:00-03:00", "30 min"],
    ["2026-11-03T13:00:00-03:00", "1 h"],
    ["2026-11-03T12:40:00-03:00", "1 h 20 min"],
    ["2026-11-03T13:59:30-03:00", "menos de 1 min"],
  ])("cancelado em %s → %s antes das 14:00", (canceledAt, text) => {
    expect(canceledAhead("2026-11-03T14:00:00-03:00", canceledAt)).toBe(text);
  });
});
