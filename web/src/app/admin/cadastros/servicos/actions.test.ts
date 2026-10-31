import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api/client";
import { createService, updateService } from "./actions";

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

const fields = {
  name: "Barba",
  description: "",
  price: "20,00",
  duration_minutes: "20",
  "barbeiro-2": "on",
};

describe("ações do cadastro de serviços — RN-61", () => {
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
    POST.mockResolvedValue({ data: { id: 3 }, response: { status: 201 } });

    await expect(createService(idle, form(fields))).rejects.toThrow(
      "REDIRECT:/admin/cadastros/servicos?aviso=cadastrado",
    );
    expect(POST).toHaveBeenCalledWith("/admin/services", {
      body: {
        name: "Barba",
        description: "",
        price: "20,00",
        duration_minutes: 20,
        barber_ids: [2],
      },
    });
  });

  it("inativa e volta para a lista com o aviso", async () => {
    PATCH.mockResolvedValue({ data: { id: 1 }, response: { status: 200 } });

    await expect(
      updateService(1, idle, form({ ...fields, situacao: "inativo" })),
    ).rejects.toThrow("REDIRECT:/admin/cadastros/servicos?aviso=atualizado");
    expect(PATCH).toHaveBeenCalledWith("/admin/services/{service_id}", {
      params: { path: { service_id: 1 } },
      body: {
        name: "Barba",
        description: "",
        price: "20,00",
        duration_minutes: 20,
        barber_ids: [2],
        active: false,
      },
    });
    // Sai da vitrine no próximo carregamento.
    expect(vi.mocked(updateTag).mock.calls).toEqual([["public-services"]]);
  });

  it("mostra o message da API e mantém o que foi digitado", async () => {
    POST.mockResolvedValue({
      response: { status: 422 },
      error: {
        code: "SERVICE_WITHOUT_BARBER",
        message: "Escolha pelo menos um barbeiro para o serviço.",
      },
    });
    const withoutBarber = {
      name: "Barba",
      description: "",
      price: "20,00",
      duration_minutes: "20",
    };

    const state = await createService(idle, form(withoutBarber));

    expect(state).toEqual({
      status: "error",
      message: "Escolha pelo menos um barbeiro para o serviço.",
      values: withoutBarber,
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("avisa sobre falha de rede", async () => {
    PATCH.mockRejectedValue(new TypeError("fetch failed"));

    const state = await updateService(1, idle, form(fields));

    expect(state).toEqual({
      status: "error",
      message: "Não foi possível salvar agora. Tente novamente em instantes.",
      values: fields,
    });
    expect(updateTag).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});
