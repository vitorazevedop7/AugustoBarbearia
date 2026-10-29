import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api/client";
import ServicosPage from "./page";

vi.mock("@/lib/api/client", () => ({ createApiClient: vi.fn() }));

const GET = vi.fn();

function page(aviso?: string) {
  return ServicosPage({ searchParams: Promise.resolve({ aviso }) });
}

describe("ServicosPage — RN-61", () => {
  beforeEach(() => {
    GET.mockReset();
    vi.mocked(createApiClient).mockReturnValue({ GET } as never);
  });

  it("lista os serviços com preço, duração, barbeiros, situação e edição", async () => {
    GET.mockResolvedValue({
      data: [
        {
          id: 2,
          name: "Corte + Barba",
          description: null,
          price: "35.00",
          duration_minutes: 45,
          active: true,
          barbers: [
            { id: 1, name: "Edvaldo", active: true },
            { id: 2, name: "Lauro", active: true },
            { id: 3, name: "Manoel", active: true },
          ],
        },
        {
          id: 5,
          name: "Platinado",
          description: "Descoloração completa.",
          price: "1234.50",
          duration_minutes: 90,
          active: false,
          barbers: [{ id: 2, name: "Lauro", active: true }],
        },
      ],
      response: { status: 200 },
    });

    render(await page());

    const [corte, platinado] = screen.getAllByRole("listitem");
    expect(within(corte).getByText("R$ 35,00")).toBeInTheDocument();
    expect(within(corte).getByText("45 min")).toBeInTheDocument();
    expect(
      within(corte).getByText("Quem realiza: Edvaldo, Lauro e Manoel"),
    ).toBeInTheDocument();
    expect(within(corte).getByText("Ativo")).toBeInTheDocument();
    expect(
      within(corte).getByRole("link", { name: "Editar Corte + Barba" }),
    ).toHaveAttribute("href", "/admin/cadastros/servicos/2");
    expect(within(platinado).getByText("R$ 1.234,50")).toBeInTheDocument();
    expect(within(platinado).getByText("1h 30min")).toBeInTheDocument();
    expect(
      within(platinado).getByText("Quem realiza: Lauro"),
    ).toBeInTheDocument();
    expect(within(platinado).getByText("Inativo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Novo serviço" })).toHaveAttribute(
      "href",
      "/admin/cadastros/servicos/novo",
    );
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("mostra o aviso de quem voltou de um formulário", async () => {
    GET.mockResolvedValue({ data: [], response: { status: 200 } });

    render(await page("cadastrado"));

    expect(screen.getByRole("status")).toHaveTextContent("Serviço cadastrado.");
  });

  it("mostra o estado vazio com o botão de cadastro", async () => {
    GET.mockResolvedValue({ data: [], response: { status: 200 } });

    render(await page("qualquer coisa"));

    expect(screen.getByText("Nenhum serviço cadastrado")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Novo serviço" })).toBeVisible();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("avisa quando a API falha", async () => {
    GET.mockRejectedValue(new TypeError("fetch failed"));

    render(await page());

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível carregar os serviços. Tente novamente em instantes.",
    );
  });
});
