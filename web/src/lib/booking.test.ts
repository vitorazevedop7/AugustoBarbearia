import { describe, expect, it } from "vitest";
import {
  BOOKING_PATH,
  bookingHref,
  bookingStep,
  parseBookingParams,
  withoutChoice,
} from "./booking";

describe("bookingHref", () => {
  it("leva ao agendamento com as escolhas, sempre na ordem do fluxo (D11)", () => {
    expect(BOOKING_PATH).toBe("/agendar");
    expect(bookingHref()).toBe("/agendar");
    expect(bookingHref({ servico: 2 })).toBe("/agendar?servico=2");
    expect(bookingHref({ barbeiro: 3 })).toBe("/agendar?barbeiro=3");
    expect(
      bookingHref({
        hora: "10:00",
        servico: 2,
        data: "2026-11-03",
        barbeiro: 3,
      }),
    ).toBe("/agendar?barbeiro=3&servico=2&data=2026-11-03&hora=10:00");
  });
});

describe("bookingStep", () => {
  it("a etapa atual é a primeira escolha que falta", () => {
    expect(bookingStep({})).toBe("barbeiro");
    expect(bookingStep({ servico: 2 })).toBe("barbeiro");
    expect(bookingStep({ barbeiro: 1 })).toBe("servico");
    expect(bookingStep({ barbeiro: 1, servico: 2 })).toBe("data");
    expect(bookingStep({ barbeiro: 1, servico: 2, data: "2026-11-03" })).toBe(
      "hora",
    );
    expect(
      bookingStep({
        barbeiro: 1,
        servico: 2,
        data: "2026-11-03",
        hora: "10:00",
      }),
    ).toBe("confirmar");
  });
});

describe("withoutChoice", () => {
  const full = {
    barbeiro: 1,
    servico: 2,
    data: "2026-11-03",
    hora: "10:00",
  };

  it("tira a escolha e as que dependem dela", () => {
    expect(withoutChoice(full, "barbeiro")).toEqual({});
    expect(withoutChoice(full, "servico")).toEqual({ barbeiro: 1 });
    expect(withoutChoice(full, "data")).toEqual({ barbeiro: 1, servico: 2 });
    expect(withoutChoice(full, "hora")).toEqual({
      barbeiro: 1,
      servico: 2,
      data: "2026-11-03",
    });
    expect(withoutChoice({ servico: 2 }, "servico")).toEqual({});
  });
});

describe("parseBookingParams", () => {
  it("lê as escolhas da URL", () => {
    expect(
      parseBookingParams({
        barbeiro: "1",
        servico: "2",
        data: "2026-11-03",
        hora: "10:00",
      }),
    ).toEqual({ barbeiro: 1, servico: 2, data: "2026-11-03", hora: "10:00" });
    expect(parseBookingParams({ servico: "2" })).toEqual({ servico: 2 });
  });

  it.each([
    [{ barbeiro: "abc" }, {}],
    [{ barbeiro: "0" }, {}],
    [{ barbeiro: "-1", servico: "1.5" }, {}],
    [{ barbeiro: ["1", "2"] }, {}],
    [
      { barbeiro: "1", servico: "2", data: "2026-02-30" },
      { barbeiro: 1, servico: 2 },
    ],
    [
      { barbeiro: "1", servico: "2", data: "2026-13-01" },
      { barbeiro: 1, servico: 2 },
    ],
    [
      { barbeiro: "1", servico: "2", data: "2026-11-00" },
      { barbeiro: 1, servico: 2 },
    ],
    [
      { barbeiro: "1", servico: "2", data: "03/11/2026" },
      { barbeiro: 1, servico: 2 },
    ],
    [
      { barbeiro: "1", servico: "2", data: "2026-11-03", hora: "25:00" },
      { barbeiro: 1, servico: 2, data: "2026-11-03" },
    ],
  ])("ignora valor malformado: %j", (params, expected) => {
    expect(parseBookingParams(params)).toEqual(expected);
  });

  it("o dia e o horário só valem com as escolhas anteriores", () => {
    expect(
      parseBookingParams({ servico: "2", data: "2026-11-03", hora: "10:00" }),
    ).toEqual({ servico: 2 });
    expect(
      parseBookingParams({ barbeiro: "1", servico: "2", hora: "10:00" }),
    ).toEqual({ barbeiro: 1, servico: 2 });
  });
});
