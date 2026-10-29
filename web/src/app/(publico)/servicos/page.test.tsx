import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getPublicServices } from "@/lib/api/public";
import { service, services } from "@/test/vitrine-data";
import ServicesPage from "./page";

vi.mock("@/lib/api/public", () => ({ getPublicServices: vi.fn() }));

describe("página de serviços — RN-61", () => {
  it("lista todos os serviços com preço, duração, quem realiza e o link para agendar", async () => {
    vi.mocked(getPublicServices).mockResolvedValue([
      ...services,
      service(3, "Barba", {
        description: "Toalha quente e navalha.",
        price: "20.50",
        duration_minutes: 90,
        barbers: [{ id: 2, name: "Lauro" }],
      }),
      service(4, "Pigmentação"),
      service(5, "Sobrancelha"),
    ]);

    render(await ServicesPage());

    expect(
      screen.getByRole("heading", { level: 1, name: "Serviços" }),
    ).toBeVisible();
    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(5);
    const barba = cards[2];
    expect(
      within(barba).getByRole("heading", { level: 2, name: "Barba" }),
    ).toBeVisible();
    expect(barba).toHaveTextContent("Preço: R$ 20,50");
    expect(barba).toHaveTextContent("Duração: 1h 30min");
    expect(barba).toHaveTextContent("Toalha quente e navalha.");
    expect(barba).toHaveTextContent("Com Lauro");
    expect(cards[0]).toHaveTextContent("Com Edvaldo, Lauro e Manoel");
    expect(
      within(barba).getByRole("link", { name: "Agendar Barba" }),
    ).toHaveAttribute("href", "/agendar?servico=3");
  });

  it("mostra o estado vazio", async () => {
    vi.mocked(getPublicServices).mockResolvedValue([]);

    render(await ServicesPage());

    expect(
      screen.getByText("Nenhum serviço disponível no momento"),
    ).toBeInTheDocument();
  });

  it("avisa quando a API não responde", async () => {
    vi.mocked(getPublicServices).mockResolvedValue(null);

    render(await ServicesPage());

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível carregar os serviços. Tente novamente em instantes.",
    );
  });
});
