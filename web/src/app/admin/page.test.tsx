import { render, screen } from "@testing-library/react";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api/client";
import { getCurrentSession } from "@/lib/session";
import AdminPage from "./page";

vi.mock("@/lib/api/client", () => ({ createApiClient: vi.fn() }));
vi.mock("@/lib/session", () => ({ getCurrentSession: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const GET = vi.fn();

describe("AdminPage — RN-71", () => {
  beforeEach(() => {
    GET.mockReset();
    vi.mocked(getCurrentSession).mockReset().mockResolvedValue(null);
    vi.mocked(createApiClient).mockReturnValue({ GET } as never);
    vi.mocked(redirect)
      .mockReset()
      .mockImplementation((destination) => {
        throw new Error(`REDIRECT:${destination}`);
      });
  });

  it("mostra acesso permitido só após a API autorizar", async () => {
    GET.mockResolvedValue({
      data: { status: "ok" },
      response: { status: 200 },
    });

    render(await AdminPage());

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Administração",
    );
    expect(screen.getByRole("status")).toHaveTextContent("Acesso permitido");
    expect(GET).toHaveBeenCalledWith("/admin/ping", {
      signal: expect.any(AbortSignal),
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it.each([
    [401, "/entrar?voltar=/admin"],
    [403, "/"],
  ])(
    "redireciona ao destino adequado quando a API retorna %s",
    async (status, destination) => {
      GET.mockResolvedValue({ response: { status } });

      await expect(AdminPage()).rejects.toThrow(`REDIRECT:${destination}`);

      expect(redirect).toHaveBeenCalledWith(destination);
    },
  );

  it("evita ciclo de login quando há sessão mas a API rejeita o JWT", async () => {
    GET.mockResolvedValue({ response: { status: 401 } });
    vi.mocked(getCurrentSession).mockResolvedValue({
      user: { id: "usuario-logado" },
    } as never);

    render(await AdminPage());

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível verificar seu acesso. Tente novamente em instantes.",
    );
    expect(redirect).not.toHaveBeenCalled();
    expect(screen.queryByText("Acesso permitido")).not.toBeInTheDocument();
  });

  it("mostra a mensagem de falha da API sem conceder acesso", async () => {
    GET.mockResolvedValue({
      response: { status: 503 },
      error: { code: "UNAVAILABLE", message: "Serviço indisponível." },
    });

    render(await AdminPage());

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Serviço indisponível.",
    );
    expect(screen.queryByText("Acesso permitido")).not.toBeInTheDocument();
    expect(redirect).not.toHaveBeenCalled();
  });

  it.each([
    { response: { status: 502 }, error: "Bad Gateway" },
    { response: { status: 200 }, data: undefined },
    { response: { status: 200 }, data: { status: "unexpected" } },
  ])("não concede acesso com resposta fora do contrato: %j", async (result) => {
    GET.mockResolvedValue(result);

    render(await AdminPage());

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível verificar seu acesso. Tente novamente em instantes.",
    );
    expect(screen.queryByText("Acesso permitido")).not.toBeInTheDocument();
  });

  it("avisa sobre falha de rede sem redirecionar para o login", async () => {
    GET.mockRejectedValue(new TypeError("fetch failed"));

    render(await AdminPage());

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível verificar seu acesso. Tente novamente em instantes.",
    );
    expect(redirect).not.toHaveBeenCalled();
    expect(screen.queryByText("Acesso permitido")).not.toBeInTheDocument();
  });
});
