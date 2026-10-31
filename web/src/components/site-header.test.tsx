import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

describe("SiteHeader sobre o hero", () => {
  let frames: FrameRequestCallback[] = [];

  /** Roda o quadro pedido pela rolagem, como o navegador faria. */
  function scrollTo(y: number) {
    window.scrollY = y;
    act(() => {
      window.dispatchEvent(new Event("scroll"));
      for (const frame of frames.splice(0)) frame(0);
    });
  }

  beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue("/");
    frames = [];
    vi.stubGlobal("requestAnimationFrame", (frame: FrameRequestCallback) => {
      frames.push(frame);
      return frames.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.scrollY = 0;
  });

  it("sem JS, fica transparente no topo do hero e rola com a página", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToStaticMarkup(<SiteHeader />);
    const header = container.querySelector("header");

    expect(header).toHaveAttribute("data-mode", "hero");
    expect(header).toHaveClass("absolute", "bg-transparent");
  });

  it("com JS, fica fixo e transparente no topo e escurece ao rolar", () => {
    render(<SiteHeader />);
    const header = screen.getByRole("banner");
    scrollTo(0);
    expect(header).toHaveAttribute("data-mode", "floating");
    expect(header).toHaveClass("fixed", "bg-transparent");

    scrollTo(120);
    expect(header).toHaveAttribute("data-mode", "pinned");
    expect(header).toHaveClass("fixed", "bg-ink");

    scrollTo(0);
    expect(header).toHaveAttribute("data-mode", "floating");
  });

  it("nas outras páginas, é uma faixa escura presa no topo", () => {
    vi.mocked(usePathname).mockReturnValue("/servicos");
    render(<SiteHeader />);
    const header = screen.getByRole("banner");
    expect(header).toHaveAttribute("data-mode", "bar");
    expect(header).toHaveClass("sticky", "bg-ink");
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

  it("guarda a navegação e o Agendar num painel escuro que desce", () => {
    render(<SiteHeader />);
    const { details } = menu();
    expect(details).toHaveAttribute("data-mobile-menu");
    expect(
      within(details).getByRole("link", { name: "Agendar horário" }),
    ).toHaveAttribute("href", "/agendar");

    const panel = within(details)
      .getByRole("navigation", { name: "Principal" })
      .closest(".bg-ink");
    // Só anima com o menu aberto e sem pedido de menos movimento.
    expect(panel).toHaveClass("motion-safe:group-open:animate-menu-down");
  });

  it("fecha ao navegar", () => {
    const { rerender } = render(<SiteHeader />);
    const { details } = menu();
    details.open = true;

    vi.mocked(usePathname).mockReturnValue("/barbeiros");
    rerender(<SiteHeader />);

    expect(details.open).toBe(false);
  });

  it("fecha ao escolher um link", () => {
    render(<SiteHeader />);
    const { details } = menu();
    details.open = true;

    fireEvent.click(within(details).getByRole("link", { name: "Contato" }));

    expect(details.open).toBe(false);
  });
});
