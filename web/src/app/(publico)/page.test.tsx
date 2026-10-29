import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import HomePage from "./page";

// O componente de servidor que consulta a API tem sua própria suíte.
vi.mock("@/components/api-status", () => ({ ApiStatus: () => null }));

vi.mock("@/lib/auth-actions", () => ({
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
}));

describe("página inicial", () => {
  it("identifica a barbearia e mostra o estado em construção", () => {
    render(
      <>
        <SiteHeader user={null} />
        <HomePage />
        <SiteFooter />
      </>,
    );

    expect(
      within(screen.getByRole("banner")).getByRole("link", {
        name: "Augusto Barbearia — página inicial",
      }),
    ).toHaveAttribute("href", "/");
    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "main-content");
    expect(
      within(main).getByRole("heading", { name: "Em construção", level: 1 }),
    ).toBeVisible();
    expect(
      within(main).getByRole("link", { name: "Veja o que vem por aí" }),
    ).toHaveAttribute("href", "#novidades");
    expect(
      within(main)
        .getAllByRole("heading", { level: 3 })
        .map((h) => h.textContent),
    ).toEqual([
      "Agendamento online",
      "Lembrete por e-mail",
      "Remarque quando precisar",
    ]);
  });

  it("mostra o horário de funcionamento no rodapé", () => {
    render(<SiteFooter />);

    const footer = screen.getByRole("contentinfo");
    expect(footer).toHaveTextContent("Segunda a sexta10h às 19h");
    expect(footer).toHaveTextContent("Sábado9h às 14h");
  });

  it("leva à política de privacidade pelo rodapé", () => {
    render(<SiteFooter />);

    expect(
      within(screen.getByRole("contentinfo")).getByRole("link", {
        name: "Política de privacidade",
      }),
    ).toHaveAttribute("href", "/privacidade");
  });
});
