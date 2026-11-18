import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api/client";
import { emptyDashboard, filledDashboard } from "@/test/dashboard-data";
import AdminHomePage from "./page";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/api/client", () => ({ createApiClient: vi.fn() }));

const GET = vi.fn();

function respond(dashboard: unknown = filledDashboard()) {
  GET.mockResolvedValue({ data: dashboard, response: { status: 200 } });
}

async function renderPage() {
  render(await AdminHomePage());
}

function region(name: string) {
  return screen.getByRole("region", { name });
}

describe("painel da administração — /admin — RN-45", () => {
  beforeEach(() => {
    GET.mockReset();
    respond();
    vi.mocked(createApiClient).mockReturnValue({ GET } as never);
  });

  it("lê o painel da API e mostra o dia de hoje no título", async () => {
    await renderPage();

    expect(GET).toHaveBeenCalledWith(
      "/admin/dashboard",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Painel",
    );
    expect(
      screen.getByText(
        "Como a barbearia está hoje, quarta-feira, 18 de novembro de 2026.",
      ),
    ).toBeInTheDocument();
  });

  it("os cartões trazem o valor, a variação e o mês anterior", async () => {
    await renderPage();

    const month = region("Mês até hoje");
    expect(
      within(month).getByText("1 a 18 de nov, comparado a 1 a 18 de out."),
    ).toBeInTheDocument();
    const card = (label: string) =>
      within(month).getByText(label).parentElement as HTMLElement;

    const revenue = card("Faturamento");
    expect(revenue).toHaveTextContent("R$ 60,50");
    expect(within(revenue).getByText("Alta de 21,0%")).toBeInTheDocument();
    expect(revenue).toHaveTextContent("Antes: R$ 50,00");

    const ticket = card("Ticket médio");
    expect(ticket).toHaveTextContent("R$ 30,25");
    expect(within(ticket).getByText("Queda de 5,5%")).toHaveClass("sr-only");
    expect(within(ticket).getByText("Queda de 5,5%").parentElement).toHaveClass(
      "text-danger",
    );

    const noShows = card("Taxa de faltas");
    expect(noShows).toHaveTextContent("33,3%");
    expect(noShows).toHaveTextContent("1 falta · antes: 0,0%");
    // Subir a taxa de faltas é ruim.
    expect(
      within(noShows).getByText("Alta de 33,3 p.p.").parentElement,
    ).toHaveClass("text-danger");

    expect(
      within(card("Atendimentos concluídos")).getByText("Estável"),
    ).toBeInTheDocument();
  });

  it("o faturamento diário é SVG do servidor com uma tabela para leitor de tela", async () => {
    await renderPage();

    const chart = region("Faturamento diário");
    expect(chart).toHaveTextContent("Últimos 30 dias · 20 de out a 18 de nov");
    expect(chart).toHaveTextContent("Melhor dia: Ter, 10 de nov · R$ 75,00");
    const svg = chart.querySelector("svg[aria-hidden='true']");
    expect(svg).not.toBeNull();
    const bars = svg?.querySelectorAll("rect") ?? [];
    expect(bars).toHaveLength(30);
    // Hoje em destaque, o dia vazio apagado, e o valor no `title` de cada barra.
    expect(bars[29]).toHaveClass("fill-brand");
    expect(bars[0]).toHaveClass("fill-line");
    expect(bars[21]?.querySelector("title")).toHaveTextContent(
      "Ter, 10 de nov: R$ 75,00 (2 atendimentos)",
    );

    const table = within(chart).getByRole("table", {
      name: "Faturamento por dia, 20 de out a 18 de nov",
    });
    expect(within(table).getAllByRole("row")).toHaveLength(31);
    expect(
      within(table).getByRole("rowheader", { name: "Ter, 10 de nov" })
        .parentElement,
    ).toHaveTextContent("R$ 75,00");
  });

  it("a ocupação mostra as duas janelas de cada barbeiro", async () => {
    await renderPage();

    const occupancy = region("Ocupação por barbeiro");
    const rows = within(occupancy).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Edvaldo");
    expect(rows[0]).toHaveTextContent("Últimos 7 dias50,0%25h de 50h");
    expect(rows[0]).toHaveTextContent("Próximos 7 dias2,8%1h 15min de 45h");
    expect(rows[0]?.querySelector("[style]")?.getAttribute("style")).toContain(
      "width: 50",
    );
    expect(rows[1]).toHaveTextContent("Próximos 7 diasSem expediente");
  });

  it("o mapa de pico é uma tabela com o número em cada célula", async () => {
    await renderPage();

    const peak = region("Horários de pico");
    expect(peak).toHaveTextContent(
      "Mais cheio: terça-feira, 10h (4 atendimentos).",
    );
    const table = within(peak).getByRole("table", {
      name: "Atendimentos por hora e dia da semana",
    });
    const headers = within(table)
      .getAllByRole("columnheader")
      .map((cell) => cell.textContent);
    // O domingo, fechado e sem atendimento, não aparece.
    expect(headers).toEqual(["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]);
    const ten = within(table).getByRole("rowheader", { name: "10h" })
      .parentElement as HTMLElement;
    const cells = within(ten).getAllByRole("cell");
    expect(cells[1]).toHaveTextContent("4");
    expect(cells[1]).toHaveAttribute("data-level", "4");
    expect(cells[0]).toHaveAttribute("data-level", "0");
    expect(cells[0]).toHaveTextContent("0");
  });

  it("hoje lista os próximos com link para o detalhe da agenda", async () => {
    await renderPage();

    const today = region("Hoje");
    expect(today).toHaveTextContent("4 atendimentos · 1 concluído");
    expect(
      within(today).getByRole("link", { name: "Ver agenda" }),
    ).toHaveAttribute("href", "/admin/agenda");
    const items = within(today).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("14:30–15:15Agora");
    expect(items[0]).toHaveTextContent("Ana Souza");
    expect(items[0]).toHaveTextContent("Corte + Barba · Edvaldo");
    expect(within(items[0] as HTMLElement).getByRole("link")).toHaveAttribute(
      "href",
      "/admin/agenda/21?data=2026-11-18",
    );
    expect(items[1]).not.toHaveTextContent("Agora");
  });

  it("sem atendimentos, mostra os estados vazios sem quebrar", async () => {
    respond(emptyDashboard());
    await renderPage();

    const month = region("Mês até hoje");
    expect(within(month).getAllByText("Sem base de comparação")).toHaveLength(
      4,
    );
    expect(within(month).getAllByText("—").length).toBeGreaterThan(0);
    expect(region("Faturamento diário")).toHaveTextContent(
      "Nenhum atendimento concluído nos últimos 30 dias.",
    );
    expect(region("Horários de pico")).toHaveTextContent(
      "Nenhum atendimento nos últimos 90 dias.",
    );
    expect(region("Hoje")).toHaveTextContent(
      "Nenhum atendimento pela frente hoje.",
    );
  });

  it("mantém os atalhos para as áreas", async () => {
    await renderPage();

    const shortcuts = region("Atalhos");
    expect(
      within(shortcuts)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual([
      "/admin/agenda",
      "/admin/relatorio",
      "/admin/clientes",
      "/admin/cadastros",
    ]);
  });

  it("se a API falha, avisa e mantém os atalhos", async () => {
    GET.mockRejectedValue(new TypeError("fetch failed"));
    await renderPage();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível carregar os indicadores. Tente novamente em instantes.",
    );
    expect(screen.queryByRole("region", { name: "Mês até hoje" })).toBeNull();
    expect(region("Atalhos")).toBeInTheDocument();
  });

  it("mostra o message da API quando ela recusa", async () => {
    GET.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Acesso restrito à administração." },
      response: { status: 403 },
    });
    await renderPage();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Acesso restrito à administração.",
    );
  });
});
