import { render, screen } from "@testing-library/react";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api/client";
import { getCurrentSession } from "@/lib/session";
import ProfilePage from "./page";

vi.mock("@/lib/api/client", () => ({ createApiClient: vi.fn() }));
vi.mock("@/lib/session", () => ({ getCurrentSession: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const GET = vi.fn();
const unavailable =
  "Não foi possível carregar seu perfil. Tente novamente em instantes.";

describe("ProfilePage — RN-10, RN-16, RN-71", () => {
  beforeEach(() => {
    GET.mockReset();
    vi.mocked(getCurrentSession)
      .mockReset()
      .mockResolvedValue({ user: { id: "cliente" } } as never);
    vi.mocked(createApiClient).mockReturnValue({ GET } as never);
    vi.mocked(redirect)
      .mockReset()
      .mockImplementation((destination) => {
        throw new Error(`REDIRECT:${destination}`);
      });
  });

  it("exige login no servidor antes de chamar a API", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(null);

    await expect(ProfilePage()).rejects.toThrow(
      "REDIRECT:/entrar?voltar=/perfil",
    );
    expect(GET).not.toHaveBeenCalled();
  });

  it("mostra o nome do Google, o e-mail e o telefone formatado", async () => {
    GET.mockResolvedValue({
      data: {
        name: "Ana Souza",
        email: "ana@example.com",
        phone: "11987654321",
      },
      response: { status: 200 },
    });

    render(await ProfilePage());

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Meu perfil",
    );
    expect(screen.getByLabelText("Nome")).toHaveValue("Ana Souza");
    expect(screen.getByLabelText("E-mail")).toHaveValue("ana@example.com");
    expect(screen.getByLabelText("E-mail")).toHaveAttribute("readonly");
    expect(screen.getByLabelText("Telefone")).toHaveValue("(11) 98765-4321");
    expect(screen.getByLabelText("Telefone")).toHaveAttribute("type", "tel");
    expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled();
    expect(GET).toHaveBeenCalledWith("/me/profile", {
      signal: expect.any(AbortSignal),
    });
  });

  it("deixa o telefone vazio quando ainda não foi informado", async () => {
    GET.mockResolvedValue({
      data: { name: "Ana", email: "ana@example.com", phone: null },
      response: { status: 200 },
    });

    render(await ProfilePage());

    expect(screen.getByLabelText("Telefone")).toHaveValue("");
  });

  it("leva a administração para /admin", async () => {
    GET.mockResolvedValue({ response: { status: 403 } });

    await expect(ProfilePage()).rejects.toThrow("REDIRECT:/admin");
  });

  it("mostra o message de erro da API", async () => {
    GET.mockResolvedValue({
      response: { status: 409 },
      error: {
        code: "CUSTOMER_EMAIL_LINKED",
        message: "Este e-mail já está vinculado a outro cadastro.",
      },
    });

    render(await ProfilePage());

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Este e-mail já está vinculado a outro cadastro.",
    );
    expect(screen.queryByRole("button", { name: "Salvar" })).toBeNull();
  });

  it.each([
    ["JWT recusado com sessão válida", { response: { status: 401 } }],
    ["resposta fora do contrato", { response: { status: 502 }, error: "Bad" }],
  ])("avisa indisponibilidade sem ciclo de login: %s", async (_, result) => {
    GET.mockResolvedValue(result);

    render(await ProfilePage());

    expect(screen.getByRole("alert")).toHaveTextContent(unavailable);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("avisa sobre falha de rede", async () => {
    GET.mockRejectedValue(new TypeError("fetch failed"));

    render(await ProfilePage());

    expect(screen.getByRole("alert")).toHaveTextContent(unavailable);
  });
});
