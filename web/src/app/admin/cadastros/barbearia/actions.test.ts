import { updateTag } from "next/cache";
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
