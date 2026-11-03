import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api/client";
import { getCurrentSession } from "@/lib/session";
import { AccountPlaceholder, HeaderAccount } from "./header-account";

vi.mock("@/lib/auth-actions", () => ({
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ getCurrentSession: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ createApiClient: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

type Session = Awaited<ReturnType<typeof getCurrentSession>>;

const GET = vi.fn();

function signedInAs(role: "admin" | "customer" | null) {
  vi.mocked(getCurrentSession).mockResolvedValue({
    user: { name: "Carlos Souza" },
  } as Session);
  GET.mockResolvedValue(
    role
      ? { data: { role }, response: { status: 200 } }
      : { response: { status: 503 } },
  );
}

describe("HeaderAccount", () => {
  beforeEach(() => {
    GET.mockReset();
    vi.mocked(createApiClient).mockReturnValue({ GET } as never);
  });

  it("oferece o login com Google ao visitante", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(null);

    render(await HeaderAccount({}));

    expect(
      screen.getByRole("button", { name: "Entrar com Google" }),
    ).toHaveAttribute("type", "submit");
    expect(screen.queryByRole("button", { name: "Sair" })).toBeNull();
  });

  it("mostra o primeiro nome e o botão de sair para quem está logado", async () => {
    signedInAs("customer");

    render(await HeaderAccount({ stacked: true }));

    expect(screen.getByText("Olá, Carlos")).toBeVisible();
    expect(screen.getByRole("button", { name: "Sair" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Entrar com Google" }),
    ).toBeNull();
  });

  it.each([true, false])(
    "o cliente chega a Meus agendamentos e ao Perfil (RN-14, RN-15), empilhado: %s",
    async (stacked) => {
      signedInAs("customer");

      render(await HeaderAccount({ stacked }));

      const nav = screen.getByRole("navigation", { name: "Sua conta" });
      expect(
        within(nav).getByRole("link", { name: "Meus agendamentos" }),
      ).toHaveAttribute("href", "/meus-agendamentos");
      expect(within(nav).getByRole("link", { name: "Perfil" })).toHaveAttribute(
        "href",
        "/perfil",
      );
      expect(screen.queryByRole("link", { name: "Administração" })).toBeNull();
      expect(GET).toHaveBeenCalledWith("/me", {
        signal: expect.any(AbortSignal),
      });
    },
  );

  it("a administração chega a /admin, sem as áreas do cliente (RN-71)", async () => {
    signedInAs("admin");

    render(await HeaderAccount({}));

    expect(screen.getByRole("link", { name: "Administração" })).toHaveAttribute(
      "href",
      "/admin",
    );
    expect(
      screen.queryByRole("link", { name: "Meus agendamentos" }),
    ).toBeNull();
    expect(screen.getByRole("button", { name: "Sair" })).toBeVisible();
  });

  it("sem resposta da API, fica só com o nome e o Sair", async () => {
    signedInAs(null);

    render(await HeaderAccount({}));

    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.getByText("Olá, Carlos")).toBeVisible();
    expect(screen.getByRole("button", { name: "Sair" })).toBeVisible();
  });

  it("não consulta a API para o visitante", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(null);

    render(await HeaderAccount({}));

    expect(GET).not.toHaveBeenCalled();
  });
});

describe("AccountPlaceholder", () => {
  it("oferece um link para entrar enquanto a sessão não chegou, sem ler a sessão", () => {
    vi.mocked(getCurrentSession).mockClear();
    render(<AccountPlaceholder />);

    const link = screen.getByRole("link", { name: "Entrar" });
    expect(link).toHaveAttribute("href", "/entrar");
    expect(link).toHaveClass("min-h-11");
    expect(link).not.toHaveClass("w-full");
    expect(getCurrentSession).not.toHaveBeenCalled();
  });

  it("ocupa toda a largura do menu do celular com a mesma altura da conta", () => {
    render(<AccountPlaceholder stacked />);

    expect(screen.getByRole("link", { name: "Entrar" })).toHaveClass(
      "w-full",
      "min-h-11",
    );
  });
});
