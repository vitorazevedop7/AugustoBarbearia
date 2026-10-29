import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getPublicShop } from "@/lib/api/public";
import { shop } from "@/test/vitrine-data";
import { SiteFooter } from "./site-footer";

vi.mock("@/lib/api/public", () => ({ getPublicShop: vi.fn() }));

describe("SiteFooter", () => {
  it("RN-02: mostra o horário de funcionamento que vem da API", async () => {
    vi.mocked(getPublicShop).mockResolvedValue({
      ...shop,
      business_hours: shop.business_hours.map((day) =>
        day.weekday === 0 ? { ...day, opens_at: null, closes_at: null } : day,
      ),
    });

    render(await SiteFooter());

    const footer = screen.getByRole("contentinfo");
    expect(footer).toHaveTextContent("SegundaFechado");
    expect(footer).toHaveTextContent("Terça a sexta10h às 19h");
    expect(footer).toHaveTextContent("Sábado9h às 14h");
    // Sem endereço nem contato preenchidos, a coluna de contato não aparece.
    expect(
      within(footer).queryByRole("heading", { name: "Contato" }),
    ).toBeNull();
  });

  it("mostra o endereço e os contatos preenchidos", async () => {
    vi.mocked(getPublicShop).mockResolvedValue({
      ...shop,
      address: "Rua A, 10",
      phone: "7533334444",
      email: "contato@example.com",
    });

    render(await SiteFooter());

    const footer = screen.getByRole("contentinfo");
    expect(
      within(footer).getByRole("heading", { name: "Contato" }),
    ).toBeVisible();
    expect(footer).toHaveTextContent("Rua A, 10");
    expect(
      within(footer).getByRole("link", { name: "Telefone (75) 3333-4444" }),
    ).toHaveAttribute("href", "tel:+557533334444");
    expect(
      within(footer).getByRole("link", { name: "E-mail contato@example.com" }),
    ).toHaveAttribute("href", "mailto:contato@example.com");
  });

  it("fica só com o nome e os links quando a API não responde", async () => {
    vi.mocked(getPublicShop).mockResolvedValue(null);

    render(await SiteFooter());

    const footer = screen.getByRole("contentinfo");
    expect(footer).toHaveTextContent("Augusto Barbearia");
    expect(footer).not.toHaveTextContent("Horário de funcionamento");
  });

  it("leva à política de privacidade", async () => {
    vi.mocked(getPublicShop).mockResolvedValue(shop);

    render(await SiteFooter());

    expect(
      within(screen.getByRole("contentinfo")).getByRole("link", {
        name: "Política de privacidade",
      }),
    ).toHaveAttribute("href", "/privacidade");
  });
});
