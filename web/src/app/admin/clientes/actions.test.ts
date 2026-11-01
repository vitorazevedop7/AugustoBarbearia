import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api/client";
import { createCustomer, updateCustomer } from "./actions";

vi.mock("@/lib/api/client", () => ({ createApiClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const POST = vi.fn();
const PATCH = vi.fn();
const idle = { status: "idle" } as const;

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("ações do cadastro de clientes — RN-20, RN-62", () => {
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

  it("cadastra só com nome e telefone e volta para a lista com o aviso", async () => {
    POST.mockResolvedValue({ data: { id: 4 }, response: { status: 201 } });

    await expect(
      createCustomer(idle, form({ name: "Ana", phone: "75999990000" })),
    ).rejects.toThrow("REDIRECT:/admin/clientes?aviso=cadastrado");
    expect(POST).toHaveBeenCalledWith("/admin/customers", {
      body: { name: "Ana", phone: "75999990000", email: "" },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/clientes");
  });

  it("edita e volta para a lista com o aviso", async () => {
    PATCH.mockResolvedValue({ data: { id: 2 }, response: { status: 200 } });

    await expect(
      updateCustomer(
        2,
        idle,
        form({ name: "Ana", phone: "", email: "ana@example.com" }),
      ),
    ).rejects.toThrow("REDIRECT:/admin/clientes?aviso=atualizado");
    expect(PATCH).toHaveBeenCalledWith("/admin/customers/{customer_id}", {
      params: { path: { customer_id: 2 } },
      body: { name: "Ana", email: "ana@example.com" },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/clientes/2");
  });

  it("mostra o message da API (e-mail repetido) e mantém o que foi digitado", async () => {
    POST.mockResolvedValue({
      response: { status: 409 },
      error: {
        code: "CUSTOMER_EMAIL_TAKEN",
        message: "Já existe um cliente cadastrado com este e-mail.",
      },
    });

    const state = await createCustomer(
      idle,
      form({ name: "Ana", phone: "75999990000", email: "ana@example.com" }),
    );

    expect(state).toEqual({
      status: "error",
      message: "Já existe um cliente cadastrado com este e-mail.",
      values: { name: "Ana", phone: "75999990000", email: "ana@example.com" },
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("avisa sobre falha de rede sem perder os dados", async () => {
    PATCH.mockRejectedValue(new TypeError("fetch failed"));

    const state = await updateCustomer(1, idle, form({ name: "Ana" }));

    expect(state).toEqual({
      status: "error",
      message: "Não foi possível salvar agora. Tente novamente em instantes.",
      values: { name: "Ana" },
    });
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});
