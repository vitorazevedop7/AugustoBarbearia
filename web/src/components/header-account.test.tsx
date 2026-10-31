import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getCurrentSession } from "@/lib/session";
import { HeaderAccount } from "./header-account";

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
