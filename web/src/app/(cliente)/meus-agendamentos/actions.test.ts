import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api/client";
import { getCurrentSession } from "@/lib/session";
import { appointment } from "@/test/appointment-data";
import { cancelAppointment, rescheduleAppointment } from "./actions";
import type { ChangeState } from "./appointments-state";

vi.mock("@/lib/api/client", () => ({ createApiClient: vi.fn() }));
vi.mock("@/lib/session", async (original) => ({
  ...(await original<typeof import("@/lib/session")>()),
  getCurrentSession: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const POST = vi.fn();
const idle: ChangeState = { status: "idle" };
const unavailable =
  "Não foi possível concluir agora. Tente novamente em instantes.";
const deadline = {
  code: "CHANGE_DEADLINE_PASSED",
  message:
    "Faltam menos de 2 horas para o seu horário. Para cancelar ou remarcar, fale com a barbearia.",
};

function form(fields: Record<string, string> = {}) {
  const data = new FormData();
  data.set("appointment_id", "7");
  data.set("voltar", "/meus-agendamentos/7/cancelar");
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

describe("cancelar e remarcar — Server Actions (RN-14, RN-15)", () => {
  beforeEach(() => {
    POST.mockReset().mockResolvedValue({
      data: appointment(),
      response: { status: 200 },
    });
    vi.mocked(createApiClient).mockReturnValue({ POST } as never);
    vi.mocked(getCurrentSession).mockReset().mockResolvedValue(null);
    vi.mocked(redirect)
      .mockReset()
      .mockImplementation((destination) => {
        throw new Error(`REDIRECT:${destination}`);
      });
  });

  it("cancela e volta para a lista com o aviso", async () => {
    await expect(cancelAppointment(idle, form())).rejects.toThrow(
      "REDIRECT:/meus-agendamentos?aviso=cancelado",
    );
    expect(POST).toHaveBeenCalledWith(
      "/me/appointments/{appointment_id}/cancel",
      {
        params: { path: { appointment_id: 7 } },
        signal: expect.any(AbortSignal),
      },
    );
  });

  it("remarca com o horário e o barbeiro escolhidos, sem o serviço", async () => {
    await expect(
      rescheduleAppointment(
        idle,
        form({ starts_at: "2026-11-04T10:30:00-03:00", barber_id: "2" }),
      ),
    ).rejects.toThrow("REDIRECT:/meus-agendamentos?aviso=remarcado");
    expect(POST).toHaveBeenCalledWith(
      "/me/appointments/{appointment_id}/reschedule",
      {
        params: { path: { appointment_id: 7 } },
        body: { starts_at: "2026-11-04T10:30:00-03:00", barber_id: 2 },
        signal: expect.any(AbortSignal),
      },
    );
  });

  it("recusa da API volta com o message e o code (RN-14)", async () => {
    POST.mockResolvedValue({ error: deadline, response: { status: 409 } });

    const state = await cancelAppointment(idle, form());

    expect(state).toEqual({ status: "error", ...deadline });
  });

  it("horário tomado na remarcação volta com o message da API (RN-08)", async () => {
    POST.mockResolvedValue({
      error: {
        code: "SLOT_UNAVAILABLE",
        message: "Este horário não está mais disponível. Escolha outro.",
      },
      response: { status: 409 },
    });

    const state = await rescheduleAppointment(
      idle,
      form({ starts_at: "2026-11-04T10:30:00-03:00", barber_id: "1" }),
    );

    expect(state).toEqual({
      status: "error",
      code: "SLOT_UNAVAILABLE",
      message: "Este horário não está mais disponível. Escolha outro.",
    });
  });

  it("falha de rede ou id inválido mostra a mensagem genérica", async () => {
    POST.mockRejectedValue(new Error("rede"));
    expect(await cancelAppointment(idle, form())).toEqual({
      status: "error",
      message: unavailable,
    });
    expect(
      await cancelAppointment(idle, form({ appointment_id: "abc" })),
    ).toEqual({ status: "error", message: unavailable });
  });

  it("sessão encerrada volta ao login e depois à mesma tela", async () => {
    POST.mockResolvedValue({
      error: { code: "UNAUTHORIZED", message: "Entre." },
      response: { status: 401 },
    });

    await expect(cancelAppointment(idle, form())).rejects.toThrow(
      "REDIRECT:/entrar?voltar=%2Fmeus-agendamentos%2F7%2Fcancelar",
    );
  });

  it("401 com sessão válida fica na página, sem ciclo de login", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({
      user: { id: "cliente" },
    } as never);
    POST.mockResolvedValue({
      error: { code: "UNAUTHORIZED", message: "Entre." },
      response: { status: 401 },
    });

    expect(await cancelAppointment(idle, form())).toEqual({
      status: "error",
      message: unavailable,
      code: "UNAUTHORIZED",
    });
  });

  it("a administração vai para /admin (RN-70)", async () => {
    POST.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Só clientes." },
      response: { status: 403 },
    });

    await expect(cancelAppointment(idle, form())).rejects.toThrow(
      "REDIRECT:/admin",
    );
  });
});
