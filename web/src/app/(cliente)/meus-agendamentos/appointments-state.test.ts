import { describe, expect, it } from "vitest";
import {
  appointmentId,
  cancelHref,
  noticeFrom,
  parseRescheduleParams,
  rescheduleHref,
  rescheduleStep,
  withoutRescheduleChoice,
} from "./appointments-state";

describe("remarcação — escolhas na URL (RN-15)", () => {
  it("monta o link na ordem barbeiro → dia → horário", () => {
    expect(rescheduleHref(7)).toBe("/meus-agendamentos/7/remarcar");
    expect(
      rescheduleHref(7, { hora: "10:30", data: "2026-11-04", barbeiro: 2 }),
    ).toBe(
      "/meus-agendamentos/7/remarcar?barbeiro=2&data=2026-11-04&hora=10:30",
    );
    expect(cancelHref(7)).toBe("/meus-agendamentos/7/cancelar");
  });

  it("a primeira escolha que falta é a etapa", () => {
    expect(rescheduleStep({})).toBe("barbeiro");
    expect(rescheduleStep({ barbeiro: 1 })).toBe("data");
    expect(rescheduleStep({ barbeiro: 1, data: "2026-11-04" })).toBe("hora");
    expect(
      rescheduleStep({ barbeiro: 1, data: "2026-11-04", hora: "10:30" }),
    ).toBe("confirmar");
  });

  it("trocar uma escolha tira ela e as que dependem dela", () => {
    const all = { barbeiro: 1, data: "2026-11-04", hora: "10:30" };
    expect(withoutRescheduleChoice(all, "data")).toEqual({ barbeiro: 1 });
    expect(withoutRescheduleChoice(all, "barbeiro")).toEqual({});
  });

  it("lê a URL com as validações do agendamento e ignora o serviço", () => {
    expect(
      parseRescheduleParams({
        barbeiro: "2",
        data: "2026-11-04",
        hora: "10:30",
        servico: "9",
      }),
    ).toEqual({ barbeiro: 2, data: "2026-11-04", hora: "10:30" });
    expect(parseRescheduleParams({ data: "2026-11-04" })).toEqual({});
    expect(
      parseRescheduleParams({
        barbeiro: "2",
        data: "2026-02-30",
        hora: "10:30",
      }),
    ).toEqual({ barbeiro: 2 });
  });

  it("aceita só ids e avisos conhecidos", () => {
    expect(appointmentId("12")).toBe(12);
    expect(appointmentId("0")).toBeNull();
    expect(appointmentId("abc")).toBeNull();
    expect(noticeFrom("cancelado")).toBe("cancelado");
    expect(noticeFrom(["remarcado"])).toBeUndefined();
    expect(noticeFrom("outro")).toBeUndefined();
  });
});
