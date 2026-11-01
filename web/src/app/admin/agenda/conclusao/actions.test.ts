import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api/client";
import type { AgendaState } from "../agenda-state";
import { completeAppointment, correctPayment, markNoShow } from "./actions";

vi.mock("@/lib/api/client", () => ({ createApiClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const POST = vi.fn();
const PATCH = vi.fn();
const idle = { status: "idle" } as const;
const agenda: AgendaState = {
  data: "2026-11-05",
  visao: "semana",
  barbeiro: 1,
};
const DETAIL = "/admin/agenda/7?data=2026-11-05&visao=semana&barbeiro=1";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("ações de conclusão — RN-31, RN-40, RN-41", () => {
  beforeEach(() => {
    POST.mockReset();
    PATCH.mockReset();
    vi.mocked(revalidatePath).mockReset();
    vi.mocked(createApiClient).mockReturnValue({ POST, PATCH } as never);
    vi.mocked(redirect)
      .mockReset()
      .mockImplementation((destination) => {
        throw new Error(`REDIRECT:${destination}`);
      });
  });

  it("conclui com o valor e a forma e volta ao detalhe com o aviso", async () => {
    POST.mockResolvedValue({ data: { id: 7 }, response: { status: 200 } });

    await expect(
      completeAppointment(
        7,
        agenda,
        idle,
        form({ amount: " 30,00 ", method: "PIX" }),
      ),
    ).rejects.toThrow(`REDIRECT:${DETAIL}&aviso=concluido`);

    expect(POST).toHaveBeenCalledWith(
      "/admin/appointments/{appointment_id}/complete",
      {
        params: { path: { appointment_id: 7 } },
        body: { method: "PIX", amount: "30,00" },
        signal: expect.any(AbortSignal),
      },
    );
    expect(revalidatePath).toHaveBeenCalledWith("/admin/agenda");
  });

  it("valor vazio deixa a API usar o preço congelado (RN-13)", async () => {
    POST.mockResolvedValue({ data: { id: 7 }, response: { status: 200 } });

    await expect(
      completeAppointment(
        7,
        agenda,
        idle,
        form({ amount: "", method: "CASH" }),
      ),
    ).rejects.toThrow("REDIRECT:");

    expect(POST.mock.calls[0][1].body).toEqual({ method: "CASH" });
  });

  it("cortesia (0) é enviada como valor, não como ausência", async () => {
    POST.mockResolvedValue({ data: { id: 7 }, response: { status: 200 } });

    await expect(
      completeAppointment(
        7,
        agenda,
        idle,
        form({ amount: "0", method: "DEBIT" }),
      ),
    ).rejects.toThrow("REDIRECT:");

    expect(POST.mock.calls[0][1].body).toEqual({
      method: "DEBIT",
      amount: "0",
    });
  });

  it("sem forma de pagamento nem chama a API", async () => {
    const state = await completeAppointment(
      7,
      agenda,
      idle,
      form({ amount: "35,00" }),
    );

    expect(POST).not.toHaveBeenCalled();
    expect(state).toEqual({
      status: "error",
      message: "Escolha a forma de pagamento.",
      values: { amount: "35,00" },
    });
  });

  it("forma fora das quatro nem chega à API", async () => {
    const state = await completeAppointment(
      7,
      agenda,
      idle,
      form({ amount: "35,00", method: "BOLETO" }),
    );

    expect(POST).not.toHaveBeenCalled();
    expect(state.status).toBe("error");
  });

  it("mostra o message da API (ainda não começou) e mantém o digitado", async () => {
    POST.mockResolvedValue({
      response: { status: 409 },
      error: {
        code: "APPOINTMENT_NOT_STARTED",
        message: "O horário de início ainda não chegou (03/11 às 10:00).",
      },
    });

    const state = await completeAppointment(
      7,
      agenda,
      idle,
      form({ amount: "30,00", method: "PIX" }),
    );

    expect(state).toEqual({
      status: "error",
      message: "O horário de início ainda não chegou (03/11 às 10:00).",
      values: { amount: "30,00", method: "PIX" },
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("falha de rede devolve a mensagem genérica", async () => {
    POST.mockRejectedValue(new Error("rede"));

    const state = await completeAppointment(
      7,
      agenda,
      idle,
      form({ method: "PIX" }),
    );

    expect(state).toMatchObject({
      status: "error",
      message: "Não foi possível salvar agora. Tente novamente em instantes.",
    });
  });

  it("marca a falta e volta ao detalhe com o aviso", async () => {
    POST.mockResolvedValue({ data: { id: 7 }, response: { status: 200 } });

    await expect(markNoShow(7, agenda, idle, form({}))).rejects.toThrow(
      `REDIRECT:${DETAIL}&aviso=faltou`,
    );

    expect(POST).toHaveBeenCalledWith(
      "/admin/appointments/{appointment_id}/no-show",
      {
        params: { path: { appointment_id: 7 } },
        signal: expect.any(AbortSignal),
      },
    );
  });

  it("falta recusada mostra o message da API", async () => {
    POST.mockResolvedValue({
      response: { status: 409 },
      error: {
        code: "APPOINTMENT_NOT_ACTIVE",
        message: "Este atendimento já foi concluído.",
      },
    });

    const state = await markNoShow(7, agenda, idle, form({}));

    expect(state).toMatchObject({
      status: "error",
      message: "Este atendimento já foi concluído.",
    });
  });

  it("corrige o pagamento e volta ao detalhe com o aviso", async () => {
    PATCH.mockResolvedValue({ data: { id: 7 }, response: { status: 200 } });

    await expect(
      correctPayment(
        7,
        agenda,
        idle,
        form({ amount: "40,00", method: "CASH" }),
      ),
    ).rejects.toThrow(`REDIRECT:${DETAIL}&aviso=corrigido`);

    expect(PATCH).toHaveBeenCalledWith(
      "/admin/appointments/{appointment_id}/payment",
      {
        params: { path: { appointment_id: 7 } },
        body: { method: "CASH", amount: "40,00" },
        signal: expect.any(AbortSignal),
      },
    );
  });

  it("correção com valor negativo mostra o message da API", async () => {
    PATCH.mockResolvedValue({
      response: { status: 422 },
      error: {
        code: "INVALID_PAYMENT_AMOUNT",
        message: "O valor cobrado não pode ser negativo.",
      },
    });

    const state = await correctPayment(
      7,
      agenda,
      idle,
      form({ amount: "-5", method: "CASH" }),
    );

    expect(state).toEqual({
      status: "error",
      message: "O valor cobrado não pode ser negativo.",
      values: { amount: "-5", method: "CASH" },
    });
  });
});
