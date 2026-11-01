import { describe, expect, it } from "vitest";
import {
  adminNoticeMessage,
  adminRescheduleHref,
  detailWithNotice,
  newAppointmentHref,
  newAppointmentStep,
  parseCustomerQuery,
  parseNewAppointmentParams,
  withoutNewChoice,
} from "./admin-booking-state";

describe("estado do agendamento manual na URL", () => {
  it("lê as escolhas na ordem e o cliente só depois do horário", () => {
    expect(
      parseNewAppointmentParams({
        barbeiro: "1",
        servico: "2",
        data: "2026-11-03",
        hora: "14:00",
        cliente: "9",
      }),
    ).toEqual({
      barbeiro: 1,
      servico: 2,
      data: "2026-11-03",
      hora: "14:00",
      cliente: 9,
    });
    expect(
      parseNewAppointmentParams({
        barbeiro: "1",
        servico: "2",
        data: "2026-11-03",
        hora: "14:00",
        cliente: "novo",
      }).cliente,
    ).toBe("novo");
    expect(
      parseNewAppointmentParams({ barbeiro: "1", servico: "2", cliente: "9" }),
    ).toEqual({ barbeiro: 1, servico: 2 });
    expect(
      parseNewAppointmentParams({
        barbeiro: "1",
        servico: "2",
        data: "2026-11-03",
        hora: "14:00",
        cliente: "abc",
      }).cliente,
    ).toBeUndefined();
  });

  it("monta o link com as escolhas e a busca, e a etapa é a primeira que falta", () => {
    const selection = {
      barbeiro: 1,
      servico: 2,
      data: "2026-11-03",
      hora: "14:00",
    };
    expect(newAppointmentHref(selection, "ana")).toBe(
      "/admin/agenda/novo?barbeiro=1&servico=2&data=2026-11-03&hora=14:00&q=ana",
    );
    expect(newAppointmentHref({ ...selection, cliente: "novo" })).toBe(
      "/admin/agenda/novo?barbeiro=1&servico=2&data=2026-11-03&hora=14:00&cliente=novo",
    );
    expect(newAppointmentHref()).toBe("/admin/agenda/novo");
    expect(newAppointmentStep({})).toBe("barbeiro");
    expect(newAppointmentStep(selection)).toBe("cliente");
    expect(newAppointmentStep({ ...selection, cliente: 3 })).toBe("confirmar");
    expect(withoutNewChoice({ ...selection, cliente: 3 }, "data")).toEqual({
      barbeiro: 1,
      servico: 2,
    });
  });

  it("apara a busca e ignora valores repetidos", () => {
    expect(parseCustomerQuery("  ana  ")).toBe("ana");
    expect(parseCustomerQuery(["a", "b"])).toBe("");
    expect(parseCustomerQuery(undefined)).toBe("");
  });

  it("leva ao detalhe na agenda do dia, só com os avisos conhecidos", () => {
    expect(detailWithNotice(7, "2026-11-03T22:30:00-03:00", "criado")).toBe(
      "/admin/agenda/7?data=2026-11-03&aviso=criado",
    );
    expect(adminNoticeMessage("cancelado")).toBe("Agendamento cancelado.");
    expect(adminNoticeMessage("<script>")).toBeUndefined();
    expect(adminRescheduleHref(7, { barbeiro: 1 })).toBe(
      "/admin/agenda/7/remarcar?barbeiro=1",
    );
  });
});
