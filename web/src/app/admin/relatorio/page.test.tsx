import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api/client";
import { agendaBarbers } from "@/test/agenda-data";
import { emptyReport, filledReport } from "@/test/report-data";
import ReportPage from "./page";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/api/client", () => ({ createApiClient: vi.fn() }));

const GET = vi.fn();

function respond(report: unknown = emptyReport()) {
  GET.mockImplementation((path: string) => {
    if (path === "/admin/barbers") {
      return Promise.resolve({
        data: [
          ...agendaBarbers.map((barber) => ({
            ...barber,
            photo_path: null,
            bio: null,
          })),
          {
            id: 4,
            name: "Zeca",
            active: false,
            photo_path: null,
            bio: null,
          },
        ],
        response: { status: 200 },
      });
    }
    return Promise.resolve({ data: report, response: { status: 200 } });
  });
}

async function renderPage(params: Record<string, string> = {}) {
  render(await ReportPage({ searchParams: Promise.resolve(params) }));
}

function reportQuery() {
  const call = GET.mock.calls.find(
    ([path]) => path === "/admin/reports/financial",
  );
  return call?.[1].params.query;
}

describe("relatório financeiro — /admin/relatorio — RN-43", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    // Terça, 3/11/2026, 9h em São Paulo.
    vi.setSystemTime(new Date("2026-11-03T12:00:00Z"));
    GET.mockReset();
    respond();
    vi.mocked(createApiClient).mockReturnValue({ GET } as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sem parâmetros, pede Este mês de todos os barbeiros", async () => {
    await renderPage();

    expect(reportQuery()).toEqual({
      start: "2026-11-01",
      end: "2026-11-30",
      barber_id: undefined,
    });
    expect(
      screen.getByRole("heading", { name: "01/11/2026 a 30/11/2026" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Este mês" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByText("Nenhum atendimento concluído neste período."),
    ).toBeInTheDocument();
  });

  it("mostra os totais, por barbeiro, por forma e a lista com formatPrice", async () => {
    respond(filledReport());
    await renderPage();

    const summary = screen
      .getByText("Faturamento")
      .closest("dl") as HTMLElement;
    expect(within(summary).getByText("R$ 60,50")).toBeInTheDocument();
    expect(
      within(summary).getByText("Atendimentos concluídos").nextSibling,
    ).toHaveTextContent("2");
    expect(within(summary).getByText("Faltas").nextSibling).toHaveTextContent(
      "1",
    );

    const byBarber = screen.getByRole("region", { name: "Por barbeiro" });
    expect(within(byBarber).getByText("Edvaldo")).toBeInTheDocument();
    expect(within(byBarber).getByText("Zeca (inativo)")).toBeInTheDocument();
    expect(
      within(byBarber).getByText("1 atendimento · 1 falta"),
    ).toBeInTheDocument();

    // As quatro formas aparecem, inclusive as zeradas.
    const byMethod = screen.getByRole("region", {
      name: "Por forma de pagamento",
    });
    const rows = within(byMethod).getAllByRole("listitem");
    expect(
      rows.map((row) => row.textContent?.replaceAll("\u00a0", " ")),
    ).toEqual([
      "Dinheiro1 atendimentoR$ 25,50",
      "Pix1 atendimentoR$ 35,00",
      "Débito0 atendimentosR$ 0,00",
      "Crédito0 atendimentosR$ 0,00",
    ]);

    const list = screen.getByRole("region", {
      name: "Atendimentos concluídos",
    });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Ter, 3 de nov · 10:00");
    expect(items[0]).toHaveTextContent("R$ 35,00");
    expect(items[0]).toHaveTextContent("Ana Souza");
    expect(items[0]).toHaveTextContent("Corte + Barba · Edvaldo · Pix");
    // 22h de São Paulo é do dia em que começa (RN-01).
    expect(items[1]).toHaveTextContent("Qua, 4 de nov · 22:00");
    expect(within(items[1]).getByRole("link")).toHaveAttribute(
      "href",
      "/admin/agenda/9?data=2026-11-04",
    );
  });

  it("ignora um barbeiro que não existe e mostra Todos de verdade (CA-13)", async () => {
    await renderPage({ barbeiro: "999" });

    expect(reportQuery().barber_id).toBeUndefined();
    expect(screen.getByLabelText("Barbeiro")).toHaveValue("");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Hoje" })).toHaveAttribute(
      "href",
      "/admin/relatorio?inicio=2026-11-03&fim=2026-11-03",
    );
  });

  it("títulos das listas ficam abaixo do período", async () => {
    respond(filledReport());
    await renderPage();

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "01/11/2026 a 30/11/2026",
      }),
    ).toBeInTheDocument();
    for (const name of [
      "Por barbeiro",
      "Por forma de pagamento",
      "Atendimentos concluídos",
    ]) {
      expect(
        screen.getByRole("heading", { level: 3, name }),
      ).toBeInTheDocument();
    }
  });

  it("lê o período e o barbeiro da URL e os mantém no formulário", async () => {
    await renderPage({
      inicio: "2026-10-05",
      fim: "2026-10-12",
      barbeiro: "2",
    });

    expect(reportQuery()).toEqual({
      start: "2026-10-05",
      end: "2026-10-12",
      barber_id: 2,
    });
    expect(screen.getByLabelText("De")).toHaveValue("2026-10-05");
    expect(screen.getByLabelText("Até")).toHaveValue("2026-10-12");
    expect(screen.getByLabelText("Barbeiro")).toHaveValue("2");
    // Nenhum atalho é o período atual.
    for (const label of ["Hoje", "Esta semana", "Este mês"]) {
      expect(screen.getByRole("link", { name: label })).not.toHaveAttribute(
        "aria-current",
      );
    }
  });

  it("os atalhos são links que mantêm o barbeiro, e funcionam sem JS", async () => {
    await renderPage({ barbeiro: "2" });

    expect(screen.getByRole("link", { name: "Hoje" })).toHaveAttribute(
      "href",
      "/admin/relatorio?inicio=2026-11-03&fim=2026-11-03&barbeiro=2",
    );
    expect(screen.getByRole("link", { name: "Esta semana" })).toHaveAttribute(
      "href",
      "/admin/relatorio?inicio=2026-11-02&fim=2026-11-08&barbeiro=2",
    );
    expect(screen.getByRole("link", { name: "Este mês" })).toHaveAttribute(
      "href",
      "/admin/relatorio?inicio=2026-11-01&fim=2026-11-30&barbeiro=2",
    );
    const form = screen
      .getByRole("button", { name: "Ver relatório" })
      .closest("form") as HTMLFormElement;
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/admin/relatorio");
  });

  it("o filtro lista os ativos e o barbeiro escolhido, mesmo inativo", async () => {
    await renderPage();
    const options = (select: HTMLElement) =>
      within(select)
        .getAllByRole("option")
        .map((option) => option.textContent);

    expect(options(screen.getByLabelText("Barbeiro"))).toEqual([
      "Todos",
      "Edvaldo",
      "Lauro",
      "Manoel",
    ]);
  });

  it("mostra o message da API quando o período é recusado, com o formulário preservado", async () => {
    GET.mockImplementation((path: string) =>
      Promise.resolve(
        path === "/admin/barbers"
          ? { data: [], response: { status: 200 } }
          : {
              error: {
                code: "INVALID_PERIOD",
                message:
                  "A data final precisa ser igual ou posterior à inicial.",
              },
              response: { status: 422 },
            },
      ),
    );

    await renderPage({ inicio: "2026-11-10", fim: "2026-11-01" });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "A data final precisa ser igual ou posterior à inicial.",
    );
    expect(screen.getByLabelText("De")).toHaveValue("2026-11-10");
    expect(screen.getByLabelText("Até")).toHaveValue("2026-11-01");
    expect(screen.queryByText("Faturamento")).not.toBeInTheDocument();
  });

  it("avisa sobre falha de rede sem derrubar a página", async () => {
    GET.mockImplementation((path: string) =>
      path === "/admin/barbers"
        ? Promise.resolve({ data: [], response: { status: 200 } })
        : Promise.reject(new TypeError("fetch failed")),
    );

    await renderPage();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível carregar o relatório. Tente novamente em instantes.",
    );
    // Sem o relatório, não há o que exportar.
    expect(
      screen.queryByRole("link", { name: "Exportar CSV" }),
    ).not.toBeInTheDocument();
  });

  it("Exportar CSV leva ao Route Handler com o período e o barbeiro atuais", async () => {
    await renderPage({
      inicio: "2026-10-01",
      fim: "2026-10-31",
      barbeiro: "2",
    });

    expect(screen.getByRole("link", { name: "Exportar CSV" })).toHaveAttribute(
      "href",
      "/admin/relatorio/exportar?inicio=2026-10-01&fim=2026-10-31&barbeiro=2",
    );
  });
});
