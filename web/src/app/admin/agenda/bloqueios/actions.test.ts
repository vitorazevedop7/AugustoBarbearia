import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api/client";
import { createTimeBlock, deleteTimeBlock } from "./actions";

vi.mock("@/lib/api/client", () => ({ createApiClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const POST = vi.fn();
const DELETE = vi.fn();
const idle = { status: "idle" } as const;

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const back = { agenda_data: "2026-11-02", agenda_visao: "semana" };

describe("ações dos bloqueios — RN-03", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-03T12:00:00Z"));
    POST.mockReset();
    DELETE.mockReset();
    vi.mocked(revalidatePath).mockReset();
    vi.mocked(createApiClient).mockReturnValue({ POST, DELETE } as never);
    vi.mocked(redirect)
      .mockReset()
      .mockImplementation((destination) => {
        throw new Error(`REDIRECT:${destination}`);
      });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("bloqueia com horário e volta para a agenda no dia do bloqueio", async () => {
    POST.mockResolvedValue({ data: { id: 21 }, response: { status: 201 } });

    await expect(
      createTimeBlock(
        idle,
        form({
          ...back,
          agenda_barbeiro: "1",
          barber_id: "1",
          date: "2026-11-05",
          start_time: "12:00",
          end_time: "13:00",
          reason: "  Almoço ",
        }),
      ),
    ).rejects.toThrow(
      "REDIRECT:/admin/agenda?data=2026-11-05&visao=semana&barbeiro=1&aviso=bloqueado",
    );
    expect(POST).toHaveBeenCalledWith("/admin/time-blocks", {
      body: {
        barber_id: 1,
        date: "2026-11-05",
        all_day: false,
        start_time: "12:00",
        end_time: "13:00",
        reason: "Almoço",
      },
      signal: expect.any(AbortSignal),
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/agenda");
  });

  it("com Dia inteiro, não envia os horários (RN-03)", async () => {
    POST.mockResolvedValue({ data: { id: 22 }, response: { status: 201 } });

    await expect(
      createTimeBlock(
        idle,
        form({
          barber_id: "2",
          date: "2026-11-05",
          all_day: "1",
          start_time: "12:00",
          end_time: "",
          reason: "",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/admin/agenda?data=2026-11-05&aviso=bloqueado");
    expect(POST.mock.calls[0][1].body).toEqual({
      barber_id: 2,
      date: "2026-11-05",
      all_day: true,
      start_time: null,
      end_time: null,
      reason: null,
    });
  });

  it("horários em branco sem Dia inteiro não pedem folga (a API recusa)", async () => {
    POST.mockResolvedValue({
      response: { status: 422 },
      error: {
        code: "INVALID_TIME_BLOCK",
        message: "Informe o início e o fim, ou marque o dia inteiro.",
      },
    });

    const state = await createTimeBlock(
      idle,
      form({
        barber_id: "1",
        date: "2026-11-05",
        start_time: "",
        end_time: "",
      }),
    );

    expect(POST.mock.calls[0][1].body).toMatchObject({
      all_day: false,
      start_time: null,
      end_time: null,
    });
    expect(state.message).toBe(
      "Informe o início e o fim, ou marque o dia inteiro.",
    );
    expect(redirect).not.toHaveBeenCalled();
  });

  it("mostra o message da API e mantém o que foi digitado", async () => {
    POST.mockResolvedValue({
      response: { status: 409 },
      error: {
        code: "TIME_BLOCK_CONFLICT",
        message:
          "Este barbeiro tem agendamento marcado nesse intervalo. Cancele ou remarque o agendamento antes de bloquear.",
      },
    });
    const fields = {
      barber_id: "1",
      date: "2026-11-05",
      start_time: "12:00",
      end_time: "13:00",
      reason: "",
    };

    const state = await createTimeBlock(idle, form(fields));

    expect(state).toEqual({
      status: "error",
      message:
        "Este barbeiro tem agendamento marcado nesse intervalo. Cancele ou remarque o agendamento antes de bloquear.",
      values: fields,
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("falha de rede ao bloquear mostra a mensagem padrão", async () => {
    POST.mockRejectedValue(new TypeError("fetch failed"));

    const state = await createTimeBlock(idle, form({ barber_id: "1" }));

    expect(state.message).toBe(
      "Não foi possível salvar agora. Tente novamente em instantes.",
    );
  });

  it("remove e volta para a agenda de onde veio", async () => {
    DELETE.mockResolvedValue({ response: { status: 204 } });

    await expect(
      deleteTimeBlock(idle, form({ block_id: "21", ...back })),
    ).rejects.toThrow(
      "REDIRECT:/admin/agenda?data=2026-11-02&visao=semana&aviso=bloqueio-removido",
    );
    expect(DELETE).toHaveBeenCalledWith("/admin/time-blocks/{block_id}", {
      params: { path: { block_id: 21 } },
      signal: expect.any(AbortSignal),
    });
  });

  it("bloqueio que não existe mais mostra o message da API", async () => {
    DELETE.mockResolvedValue({
      response: { status: 404 },
      error: {
        code: "TIME_BLOCK_NOT_FOUND",
        message: "Bloqueio não encontrado.",
      },
    });

    const state = await deleteTimeBlock(idle, form({ block_id: "21" }));

    expect(state).toEqual({
      status: "error",
      message: "Bloqueio não encontrado.",
    });
  });

  it("id inválido não chama a API", async () => {
    const state = await deleteTimeBlock(idle, form({ block_id: "abc" }));

    expect(state.status).toBe("error");
    expect(DELETE).not.toHaveBeenCalled();
  });
});
