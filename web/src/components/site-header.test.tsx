import { fireEvent, render, screen, within } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SiteHeader } from "./site-header";

// A conta lê a sessão no servidor e tem sua própria suíte.
vi.mock("@/components/header-account", () => ({
  HeaderAccount: () => <p>Conta do usuário</p>,
  AccountPlaceholder: () => null,
}));
vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));

describe("SiteHeader", () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue("/");
  });

  it("leva à página inicial pelo logo", () => {
    render(<SiteHeader />);
    expect(
      within(screen.getByRole("banner")).getByRole("link", {
        name: "Augusto Barbearia — página inicial",
      }),
    ).toHaveAttribute("href", "/");
  });

  it("mostra a conta no desktop e no menu do celular", () => {
    render(<SiteHeader />);
    expect(screen.getAllByText("Conta do usuário")).toHaveLength(2);
  });

  it("navega pela vitrine e chama para agendar", () => {
    render(<SiteHeader />);
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
    render(<SiteHeader />);
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
    render(<SiteHeader />);
    const { summary, details } = menu();
    details.open = true;

    fireEvent.keyDown(document, { key: "Escape" });

    expect(details.open).toBe(false);
    expect(summary).toHaveFocus();
  });

  it("fecha ao escolher um link", () => {
    render(<SiteHeader />);
    const { details } = menu();
    details.open = true;

    fireEvent.click(within(details).getByRole("link", { name: "Contato" }));

    expect(details.open).toBe(false);
  });
});
