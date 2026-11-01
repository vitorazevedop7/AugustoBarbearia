import { describe, expect, it } from "vitest";
import {
  adminNoticeMessage,
  customerNoticeText,
  adminRescheduleHref,
  detailWithNotice,
  noticeFor,
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

  it("o aviso só fala de e-mail quando o cliente tem e-mail (RN-50, RN-52)", () => {
    expect(noticeFor("criado", "ana@example.com")).toBe("criado");
    expect(noticeFor("remarcado", null)).toBe("remarcado-sem-email");
    expect(noticeFor("cancelado", undefined)).toBe("cancelado-sem-email");
    for (const notice of [
      "criado-sem-email",
      "remarcado-sem-email",
      "cancelado-sem-email",
    ]) {
      const message = adminNoticeMessage(notice) ?? "";
      expect(message).toContain("não tem e-mail cadastrado");
      expect(message).not.toContain("será avisado por e-mail");
    }
    expect(customerNoticeText("ana@example.com")).toBe(
      "O cliente será avisado por e-mail.",
    );
    expect(customerNoticeText(null)).toContain("não tem e-mail cadastrado");
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
    expect(adminNoticeMessage("cancelado")).toBe(
      "Agendamento cancelado. O cliente será avisado por e-mail.",
    );
    expect(adminNoticeMessage("<script>")).toBeUndefined();
    expect(adminRescheduleHref(7, { barbeiro: 1 })).toBe(
      "/admin/agenda/7/remarcar?barbeiro=1",
    );
  });
});
