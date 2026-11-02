import { fireEvent, render, screen, within } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SiteHeader } from "./site-header";

const account = vi.hoisted(() => ({ pending: false }));

// A conta lê a sessão no servidor e tem sua própria suíte.
vi.mock("@/lib/session", () => ({ getCurrentSession: vi.fn() }));
vi.mock("@/lib/auth-actions", () => ({
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("@/components/header-account", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/components/header-account")>();
  return {
    ...original,
    HeaderAccount: () => {
      if (account.pending) throw new Promise(() => {});
      return <p>Conta do usuário</p>;
    },
  };
});
vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));

describe("SiteHeader", () => {
  beforeEach(() => {
    account.pending = false;
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

  it("mantém o login no HTML inicial no desktop e no menu enquanto a sessão espera", () => {
    account.pending = true;
    const container = document.createElement("div");
    container.innerHTML = renderToStaticMarkup(<SiteHeader />);

    const links = container.querySelectorAll('a[href="/entrar"]');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveTextContent("Entrar");
    expect(links[0]).toHaveClass("min-h-11");
    expect(links[0].parentElement).toHaveClass("w-52", "justify-end");
    expect(links[1]).toHaveClass("min-h-11", "w-full");
    expect(links[1].closest("details")).not.toBeNull();
    account.pending = false;
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

describe("SiteHeader sem fixar", () => {
  it("na página inicial, fica transparente no topo do hero e rola com a página", () => {
    vi.mocked(usePathname).mockReturnValue("/");
    const container = document.createElement("div");
    container.innerHTML = renderToStaticMarkup(<SiteHeader />);
    const header = container.querySelector("header");

    expect(header).toHaveAttribute("data-mode", "hero");
    expect(header).toHaveClass("absolute", "bg-transparent");
  });

  it("não fica fixo quando a página rola", () => {
    vi.mocked(usePathname).mockReturnValue("/");
    render(<SiteHeader />);
    const header = screen.getByRole("banner");
    window.scrollY = 120;
    fireEvent.scroll(window);

    expect(header).toHaveAttribute("data-mode", "hero");
    expect(header).not.toHaveClass("fixed");
    expect(header).not.toHaveClass("sticky");
    window.scrollY = 0;
  });

  it("nas outras páginas, é uma faixa escura no topo que rola com a página", () => {
    vi.mocked(usePathname).mockReturnValue("/servicos");
    render(<SiteHeader />);
    const header = screen.getByRole("banner");
    expect(header).toHaveAttribute("data-mode", "bar");
    expect(header).toHaveClass("relative", "bg-ink");
    expect(header).not.toHaveClass("sticky");
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

  it("abre com a página no topo, para o painel ocupar o resto da tela", () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    render(<SiteHeader />);
    const { details } = menu();

    details.open = true;
    fireEvent(details, new Event("toggle"));
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "instant" });

    scrollTo.mockClear();
    details.open = false;
    fireEvent(details, new Event("toggle"));
    expect(scrollTo).not.toHaveBeenCalled();
    scrollTo.mockRestore();
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
