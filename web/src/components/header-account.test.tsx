import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getCurrentSession } from "@/lib/session";
import { AccountPlaceholder, HeaderAccount } from "./header-account";

vi.mock("@/lib/auth-actions", () => ({
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ getCurrentSession: vi.fn() }));

type Session = Awaited<ReturnType<typeof getCurrentSession>>;

describe("HeaderAccount", () => {
  it("oferece o login com Google ao visitante", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(null);

    render(await HeaderAccount({}));

    expect(
      screen.getByRole("button", { name: "Entrar com Google" }),
    ).toHaveAttribute("type", "submit");
    expect(screen.queryByRole("button", { name: "Sair" })).toBeNull();
  });

  it("mostra o primeiro nome e o botão de sair para quem está logado", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({
      user: { name: "Carlos Souza" },
    } as Session);

    render(await HeaderAccount({ stacked: true }));

    expect(screen.getByText("Olá, Carlos")).toBeVisible();
    expect(screen.getByRole("button", { name: "Sair" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Entrar com Google" }),
    ).toBeNull();
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
