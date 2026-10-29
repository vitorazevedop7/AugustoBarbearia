import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SiteHeader } from "./site-header";

vi.mock("@/lib/auth-actions", () => ({
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
}));

describe("SiteHeader", () => {
  it("oferece o login com Google ao visitante", () => {
    render(<SiteHeader user={null} />);
    expect(
      screen.getByRole("button", { name: "Entrar com Google" }),
    ).toHaveAttribute("type", "submit");
    expect(screen.queryByRole("button", { name: "Sair" })).toBeNull();
  });

  it("mostra o primeiro nome e o botão de sair para quem está logado", () => {
    render(<SiteHeader user={{ name: "Carlos Souza" }} />);
    expect(screen.getByText("Olá, Carlos")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sair" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Entrar com Google" }),
    ).toBeNull();
  });
});
