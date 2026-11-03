import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api/client";
import { getCurrentSession } from "@/lib/session";
import { confirmBooking } from "./actions";
import type { ConfirmState } from "./booking-state";

vi.mock("@/lib/api/client", () => ({ createApiClient: vi.fn() }));
vi.mock("@/lib/session", async (original) => ({
  ...(await original<typeof import("@/lib/session")>()),
  getCurrentSession: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const POST = vi.fn();
const PATCH = vi.fn();
const previous: ConfirmState = { status: "idle", phone: "" };
const unavailable =
  "Não foi possível confirmar agora. Tente novamente em instantes.";
const back = "/agendar?barbeiro=1&servico=2&data=2026-11-03&hora=10:00";
const appointment = {
  id: 7,
  status: "SCHEDULED",
  barber: { id: 1, name: "Edvaldo" },
  service: { id: 2, name: "Corte + Barba" },
  starts_at: "2026-11-03T10:00:00-03:00",
  ends_at: "2026-11-03T10:45:00-03:00",
  price: "35.00",
  duration_minutes: 45,
  canceled_at: null,
  canceled_by: null,
  change_deadline: "2026-11-03T08:00:00-03:00",
  can_cancel: true,
  can_reschedule: true,
};

function form(phone?: string) {
  const data = new FormData();
  data.set("barber_id", "1");
  data.set("service_id", "2");
  data.set("starts_at", "2026-11-03T10:00:00-03:00");
  data.set("voltar", back);
  if (phone !== undefined) data.set("phone", phone);
  return data;
}

describe("confirmBooking — RN-10 a RN-13", () => {
  beforeEach(() => {
    POST.mockReset().mockResolvedValue({
      data: appointment,
      response: { status: 201 },
    });
    PATCH.mockReset().mockResolvedValue({
      data: { name: "Ana", email: "ana@example.com", phone: "11987654321" },
      response: { status: 200 },
    });
    vi.mocked(getCurrentSession).mockReset().mockResolvedValue(null);
    vi.mocked(createApiClient).mockReturnValue({ POST, PATCH } as never);
    vi.mocked(redirect)
      .mockReset()
      .mockImplementation((destination) => {
        throw new Error(`REDIRECT:${destination}`);
      });
  });

  it("cria o agendamento e vai para a página própria do horário confirmado", async () => {
    // #155: recarregar essa página não pede a confirmação de novo.
    await expect(confirmBooking(previous, form())).rejects.toThrow(
      `REDIRECT:/agendar/confirmado/${appointment.id}`,
    );

    expect(PATCH).not.toHaveBeenCalled();
    expect(POST).toHaveBeenCalledWith("/me/appointments", {
      body: {
        barber_id: 1,
        service_id: 2,
        starts_at: "2026-11-03T10:00:00-03:00",
      },
      signal: expect.any(AbortSignal),
    });
  });

  it("salva o telefone antes de agendar quando o perfil não tem (RN-10)", async () => {
    await expect(
      confirmBooking(previous, form("(11) 98765-4321")),
    ).rejects.toThrow("REDIRECT:/agendar/confirmado/");

    expect(PATCH).toHaveBeenCalledWith("/me/profile", {
      body: { phone: "(11) 98765-4321" },
      signal: expect.any(AbortSignal),
    });
    expect(PATCH.mock.invocationCallOrder[0]).toBeLessThan(
      POST.mock.invocationCallOrder[0],
    );
  });

  it("telefone recusado: mostra o message da API, mantém o digitado e não agenda", async () => {
    PATCH.mockResolvedValue({
      response: { status: 422 },
      error: {
        code: "VALIDATION_ERROR",
        message: "Informe o telefone com DDD.",
      },
    });

    const state = await confirmBooking(previous, form("98765"));

    expect(POST).not.toHaveBeenCalled();
    expect(state).toEqual({
      status: "error",
      message: "Informe o telefone com DDD.",
      code: "VALIDATION_ERROR",
      phone: "98765",
    });
  });

  it.each([
    [
      "APPOINTMENT_LIMIT_REACHED",
      "Você já tem 2 agendamentos marcados, que é o máximo. Para marcar outro, cancele um deles ou espere o próximo atendimento.",
    ],
    [
      "SLOT_UNAVAILABLE",
      "Este horário não está mais disponível. Escolha outro.",
    ],
    [
      "PHONE_REQUIRED",
      "Informe seu telefone para agendar. A barbearia usa o telefone para falar com você.",
    ],
  ])(
    "mostra o message da API sem decidir a regra: %s",
    async (code, message) => {
      POST.mockResolvedValue({
        response: { status: 409 },
        error: { code, message },
      });

      const state = await confirmBooking(previous, form());

      expect(state).toEqual({ status: "error", message, code, phone: "" });
    },
  );

  it("sessão encerrada: volta ao login e depois à mesma confirmação", async () => {
    POST.mockResolvedValue({ response: { status: 401 } });

    await expect(confirmBooking(previous, form())).rejects.toThrow(
      `REDIRECT:/entrar?voltar=${encodeURIComponent(back)}`,
    );
  });

  it("não cria ciclo de login quando a API recusa o JWT de uma sessão válida", async () => {
    POST.mockResolvedValue({ response: { status: 401 } });
    vi.mocked(getCurrentSession).mockResolvedValue({ user: {} } as never);

    const state = await confirmBooking(previous, form());

    expect(state).toEqual({ status: "error", message: unavailable, phone: "" });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("a administração vai para /admin (RN-70)", async () => {
    POST.mockResolvedValue({ response: { status: 403 } });

    await expect(confirmBooking(previous, form())).rejects.toThrow(
      "REDIRECT:/admin",
    );
  });

  it("não aceita voltar para fora do site", async () => {
    POST.mockResolvedValue({ response: { status: 401 } });
    const data = form();
    data.set("voltar", "//exemplo.com");

    await expect(confirmBooking(previous, data)).rejects.toThrow(
      `REDIRECT:/entrar?voltar=${encodeURIComponent("/")}`,
    );
  });

  it("avisa sobre falha de rede", async () => {
    POST.mockRejectedValue(new TypeError("fetch failed"));

    const state = await confirmBooking(previous, form());

    expect(state).toEqual({ status: "error", message: unavailable, phone: "" });
  });
});
