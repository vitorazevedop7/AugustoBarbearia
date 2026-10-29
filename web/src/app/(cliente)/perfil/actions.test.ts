import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api/client";
import { getCurrentSession } from "@/lib/session";
import { saveProfile } from "./actions";
import type { ProfileFormState } from "./profile-state";

vi.mock("@/lib/api/client", () => ({ createApiClient: vi.fn() }));
vi.mock("@/lib/session", () => ({ getCurrentSession: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const PATCH = vi.fn();
const previous: ProfileFormState = {
  status: "idle",
  values: { name: "Ana", phone: "" },
};
const unavailable =
  "Não foi possível carregar seu perfil. Tente novamente em instantes.";

function form(name: string, phone: string) {
  const data = new FormData();
  data.set("name", name);
  data.set("phone", phone);
  data.set("email", "ignorado@example.com");
  return data;
}

describe("saveProfile — RN-62", () => {
  beforeEach(() => {
    PATCH.mockReset();
    vi.mocked(getCurrentSession).mockReset().mockResolvedValue(null);
    vi.mocked(createApiClient).mockReturnValue({ PATCH } as never);
    vi.mocked(redirect)
      .mockReset()
      .mockImplementation((destination) => {
        throw new Error(`REDIRECT:${destination}`);
      });
  });

  it("envia só nome e telefone e mostra o que a API salvou", async () => {
    PATCH.mockResolvedValue({
      data: {
        name: "Ana Souza",
        email: "ana@example.com",
        phone: "11987654321",
      },
      response: { status: 200 },
    });

    const state = await saveProfile(
      previous,
      form("Ana Souza", "11 98765 4321"),
    );

    expect(PATCH).toHaveBeenCalledWith("/me/profile", {
      body: { name: "Ana Souza", phone: "11 98765 4321" },
      signal: expect.any(AbortSignal),
    });
    expect(state).toEqual({
      status: "success",
      message: "Perfil salvo.",
      values: { name: "Ana Souza", phone: "(11) 98765-4321" },
    });
  });

  it("mostra o message da API e mantém o que foi digitado", async () => {
    PATCH.mockResolvedValue({
      response: { status: 422 },
      error: {
        code: "VALIDATION_ERROR",
        message: "Confira os dados informados e tente novamente.",
      },
    });

    const state = await saveProfile(previous, form("Ana", "98765-4321"));

    expect(state).toEqual({
      status: "error",
      message: "Confira os dados informados e tente novamente.",
      values: { name: "Ana", phone: "98765-4321" },
    });
  });

  it("leva ao login quando a sessão acabou", async () => {
    PATCH.mockResolvedValue({ response: { status: 401 } });

    await expect(
      saveProfile(previous, form("Ana", "11987654321")),
    ).rejects.toThrow("REDIRECT:/entrar?voltar=/perfil");
  });

  it("não cria ciclo de login quando a API recusa um JWT de sessão válida", async () => {
    PATCH.mockResolvedValue({ response: { status: 401 } });
    vi.mocked(getCurrentSession).mockResolvedValue({ user: {} } as never);

    const state = await saveProfile(previous, form("Ana", "11987654321"));

    expect(state.status).toBe("error");
    expect(state.message).toBe(unavailable);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("leva a administração para /admin", async () => {
    PATCH.mockResolvedValue({ response: { status: 403 } });

    await expect(
      saveProfile(previous, form("Ana", "11987654321")),
    ).rejects.toThrow("REDIRECT:/admin");
  });

  it("avisa sobre falha de rede", async () => {
    PATCH.mockRejectedValue(new TypeError("fetch failed"));

    const state = await saveProfile(previous, form("Ana", "11987654321"));

    expect(state).toEqual({
      status: "error",
      message: unavailable,
      values: { name: "Ana", phone: "11987654321" },
    });
  });
});
