import { fireEvent, render, screen, within } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SiteHeader } from "./site-header";

vi.mock("@/lib/auth-actions", () => ({
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));

describe("SiteHeader", () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue("/");
  });

  it("leva à página inicial pelo logo", () => {
    render(<SiteHeader user={null} />);
    expect(
      within(screen.getByRole("banner")).getByRole("link", {
        name: "Augusto Barbearia — página inicial",
      }),
    ).toHaveAttribute("href", "/");
  });

  it("oferece o login com Google ao visitante", () => {
    render(<SiteHeader user={null} />);
    for (const button of screen.getAllByRole("button", {
      name: "Entrar com Google",
    })) {
      expect(button).toHaveAttribute("type", "submit");
    }
    expect(screen.queryByRole("button", { name: "Sair" })).toBeNull();
  });

  it("mostra o primeiro nome e o botão de sair para quem está logado", () => {
    render(<SiteHeader user={{ name: "Carlos Souza" }} />);
    expect(screen.getAllByText("Olá, Carlos")).not.toHaveLength(0);
    expect(screen.getAllByRole("button", { name: "Sair" })).not.toHaveLength(0);
    expect(
      screen.queryByRole("button", { name: "Entrar com Google" }),
    ).toBeNull();
  });

  it("navega pela vitrine e chama para agendar", () => {
    render(<SiteHeader user={null} />);
    const [desktop] = screen.getAllByRole("navigation", { name: "Principal" });
    expect(
      within(desktop)
        .getAllByRole("link")
        .map((link) => [link.textContent, link.getAttribute("href")]),
    ).toEqual([
      ["Serviços", "/servicos"],
      ["Barbeiros", "/barbeiros"],
      ["Contato", "/#contato"],
    ]);
    expect(screen.getByRole("link", { name: "Agendar" })).toHaveAttribute(
      "href",
      "/agendar",
    );
    expect(
      screen.getByRole("link", { name: "Agendar horário" }),
    ).toHaveAttribute("href", "/agendar");
  });

  it("marca a página atual", () => {
    vi.mocked(usePathname).mockReturnValue("/barbeiros");
    render(<SiteHeader user={null} />);
    for (const link of screen.getAllByRole("link", { name: "Barbeiros" })) {
      expect(link).toHaveAttribute("aria-current", "page");
    }
    for (const link of screen.getAllByRole("link", { name: "Serviços" })) {
      expect(link).not.toHaveAttribute("aria-current");
    }
  });
});

describe("MobileMenu no cabeçalho", () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue("/");
  });

  function menu() {
    const summary = screen.getByText("Menu").closest("summary");
    const details = summary?.closest("details");
    if (!summary || !details) throw new Error("menu não encontrado");
    return { summary, details };
  }

  it("fecha com Esc e devolve o foco ao botão", () => {
    render(<SiteHeader user={null} />);
    const { summary, details } = menu();
    details.open = true;

    fireEvent.keyDown(document, { key: "Escape" });

    expect(details.open).toBe(false);
    expect(summary).toHaveFocus();
  });

  it("fecha ao escolher um link", () => {
    render(<SiteHeader user={null} />);
    const { details } = menu();
    details.open = true;

    fireEvent.click(within(details).getByRole("link", { name: "Contato" }));

    expect(details.open).toBe(false);
  });
});
