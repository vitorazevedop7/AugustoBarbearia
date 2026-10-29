import { describe, expect, it } from "vitest";
import { BOOKING_PATH, bookingHref } from "./booking";

describe("bookingHref", () => {
  it("leva ao agendamento com o serviço ou o barbeiro já escolhido", () => {
    expect(BOOKING_PATH).toBe("/agendar");
    expect(bookingHref({})).toBe("/agendar");
    expect(bookingHref({ servico: 2 })).toBe("/agendar?servico=2");
    expect(bookingHref({ barbeiro: 3 })).toBe("/agendar?barbeiro=3");
    expect(bookingHref({ servico: 2, barbeiro: 3 })).toBe(
      "/agendar?servico=2&barbeiro=3",
    );
  });
});
