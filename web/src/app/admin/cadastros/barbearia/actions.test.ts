import { revalidatePath, updateTag } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api/client";
import { saveBusinessHours, saveShop } from "./actions";

vi.mock("@/lib/api/client", () => ({ createApiClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }));

const PUT = vi.fn();
const idle = { status: "idle" } as const;

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

/** Todos os dias fechados: o formulário mais curto que passa na validação. */
function closedWeek() {
  return form(
    Object.fromEntries(
      Array.from({ length: 7 }, (_, weekday) => [
        `dia-${weekday}-situacao`,
        "fechado",
      ]),
    ),
  );
}

describe("ações dos dados da barbearia", () => {
  beforeEach(() => {
    PUT.mockReset();
    vi.mocked(updateTag).mockReset();
    vi.mocked(revalidatePath).mockReset();
    vi.mocked(createApiClient).mockReturnValue({ PUT } as never);
  });

  it("salvar os dados atualiza a vitrine e o rodapé", async () => {
    PUT.mockResolvedValue({ data: {}, response: { status: 200 } });

    const state = await saveShop(idle, form({ name: "Augusto Barbearia" }));

    expect(state.status).toBe("success");
    expect(vi.mocked(updateTag).mock.calls).toEqual([["public-shop"]]);
  });

  it("RN-02: salvar o horário atualiza a vitrine e o rodapé", async () => {
    PUT.mockResolvedValue({ data: [], response: { status: 200 } });

    const state = await saveBusinessHours(idle, closedWeek());

    expect(state.status).toBe("success");
    expect(vi.mocked(updateTag).mock.calls).toEqual([["public-shop"]]);
  });

  it("RN-02: devolve o conflito de expediente e mantém os valores sem invalidar o cache", async () => {
    const message =
      "Há agendamentos futuros fora do novo horário de funcionamento. Remarque esses agendamentos antes de alterar o horário.";
    PUT.mockResolvedValue({
      response: { status: 409 },
      error: { code: "BUSINESS_HOURS_CONFLICT", message },
    });
    const data = closedWeek();
    data.set("dia-0-situacao", "aberto");
    data.set("dia-0-abertura", "10:00");
    data.set("dia-0-fechamento", "17:00");

    const state = await saveBusinessHours(idle, data);

    expect(PUT).toHaveBeenCalledWith("/admin/business-hours", {
      body: Array.from({ length: 7 }, (_, weekday) =>
        weekday === 0
          ? { weekday, opens_at: "10:00", closes_at: "17:00" }
          : { weekday, opens_at: null, closes_at: null },
      ),
    });
    expect(state).toEqual({
      status: "error",
      message,
      values: Object.fromEntries(data.entries()),
    });
    expect(updateTag).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("não mexe no cache quando a API recusa", async () => {
    PUT.mockResolvedValue({
      response: { status: 422 },
      error: { code: "VALIDATION_ERROR", message: "Confira os dados." },
    });

    const state = await saveShop(idle, form({ name: "" }));

    expect(state).toMatchObject({
      status: "error",
      message: "Confira os dados.",
    });
    expect(updateTag).not.toHaveBeenCalled();
  });
});
