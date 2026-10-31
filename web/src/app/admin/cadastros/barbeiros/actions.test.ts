import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api/client";
import { createBarber, updateBarber } from "./actions";

vi.mock("@/lib/api/client", () => ({ createApiClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const POST = vi.fn();
const PATCH = vi.fn();
const idle = { status: "idle" } as const;

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("ações do cadastro de barbeiros — RN-60", () => {
  beforeEach(() => {
    POST.mockReset();
    PATCH.mockReset();
    vi.mocked(updateTag).mockReset();
    vi.mocked(createApiClient).mockReturnValue({ POST, PATCH } as never);
    vi.mocked(redirect)
      .mockReset()
      .mockImplementation((destination) => {
        throw new Error(`REDIRECT:${destination}`);
      });
  });

  it("cadastra e volta para a lista com o aviso", async () => {
    POST.mockResolvedValue({ data: { id: 4 }, response: { status: 201 } });

    await expect(
      createBarber(idle, form({ name: "Caio", photo_path: "", bio: "" })),
    ).rejects.toThrow("REDIRECT:/admin/cadastros/barbeiros?aviso=cadastrado");
    expect(POST).toHaveBeenCalledWith("/admin/barbers", {
      body: { name: "Caio", photo_path: "", bio: "" },
    });
  });

  it("edita a situação e volta para a lista com o aviso", async () => {
    PATCH.mockResolvedValue({ data: { id: 2 }, response: { status: 200 } });

    await expect(
      updateBarber(
        2,
        idle,
        form({ name: "Lauro", photo_path: "", bio: "", situacao: "inativo" }),
      ),
    ).rejects.toThrow("REDIRECT:/admin/cadastros/barbeiros?aviso=atualizado");
    expect(PATCH).toHaveBeenCalledWith("/admin/barbers/{barber_id}", {
      params: { path: { barber_id: 2 } },
      body: { name: "Lauro", photo_path: "", bio: "", active: false },
    });
    // Sai da vitrine no próximo carregamento.
    expect(vi.mocked(updateTag).mock.calls).toEqual([
      ["public-barbers"],
      ["public-services"],
    ]);
  });

  it("mostra o message da API e mantém o que foi digitado", async () => {
    POST.mockResolvedValue({
      response: { status: 422 },
      error: {
        code: "VALIDATION_ERROR",
        message: "Confira os dados informados e tente novamente.",
      },
    });

    const state = await createBarber(
      idle,
      form({ name: "Caio", photo_path: "foto.jpg", bio: "" }),
    );

    expect(state).toEqual({
      status: "error",
      message: "Confira os dados informados e tente novamente.",
      values: { name: "Caio", photo_path: "foto.jpg", bio: "" },
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("avisa sobre falha de rede", async () => {
    PATCH.mockRejectedValue(new TypeError("fetch failed"));

    const state = await updateBarber(1, idle, form({ name: "Edvaldo" }));

    expect(state).toEqual({
      status: "error",
      message: "Não foi possível salvar agora. Tente novamente em instantes.",
      values: { name: "Edvaldo" },
    });
    expect(updateTag).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});
