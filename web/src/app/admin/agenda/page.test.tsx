import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api/client";
import {
  adminAppointment,
  agendaBarbers,
  agendaDay,
  agendaWeek,
} from "@/test/agenda-data";
import AgendaPage from "./page";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/api/client", () => ({ createApiClient: vi.fn() }));

const GET = vi.fn();

type Responses = { agenda?: unknown; barbers?: unknown };

function respond({ agenda = agendaDay(), barbers }: Responses = {}) {
  GET.mockImplementation((path: string) => {
    if (path === "/admin/time-blocks") {
      return Promise.resolve({ data: [], response: { status: 200 } });
    }
    if (path === "/admin/barbers") {
      return Promise.resolve({
        data:
          barbers ??
          agendaBarbers.map((barber) => ({
            ...barber,
            photo_path: null,
            bio: null,
          })),
        response: { status: 200 },
      });
    }
    return Promise.resolve({ data: agenda, response: { status: 200 } });
  });
}

async function renderPage(params: Record<string, string> = {}) {
  render(await AgendaPage({ searchParams: Promise.resolve(params) }));
}

function agendaQuery() {
  const call = GET.mock.calls.find(([path]) => path === "/admin/appointments");
  return call?.[1].params.query;
}

describe("agenda da administração — /admin/agenda", () => {
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

  it("sem parâmetros, mostra hoje com uma lista por barbeiro (RN-02, RN-30)", async () => {
    respond({
      agenda: agendaDay({
        appointments: [
          adminAppointment(),
          adminAppointment({
            id: 8,
            status: "CANCELED",
            barber: { id: 2, name: "Lauro", active: true },
            customer: { id: 4, name: "Bruno Lima", phone: null, email: null },
            service: { id: 1, name: "Corte Simples" },
            starts_at: "2026-11-03T14:00:00-03:00",
            ends_at: "2026-11-03T14:30:00-03:00",
            canceled_at: "2026-11-02T10:00:00-03:00",
            canceled_by: "CUSTOMER",
          }),
        ],
      }),
    });

    await renderPage();

    expect(agendaQuery()).toEqual({
      start: "2026-11-03",
      end: "2026-11-03",
      barber_id: undefined,
    });
    expect(
      screen.getByRole("heading", { level: 1, name: "Agenda" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "terça-feira, 3 de novembro de 2026",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("10:00 às 19:00")).toBeInTheDocument();

    const edvaldo = screen.getByRole("region", { name: "Edvaldo" });
    const item = within(edvaldo).getByRole("link");
    expect(item).toHaveAttribute("href", "/admin/agenda/7?data=2026-11-03");
    expect(item).toHaveTextContent("10:00–10:45");
    expect(item).toHaveTextContent("Ana Souza");
    expect(item).toHaveTextContent("Corte + Barba");
    expect(item).toHaveTextContent("Agendado");

    const lauro = screen.getByRole("region", { name: "Lauro" });
    expect(within(lauro).getByRole("link")).toHaveTextContent("Cancelado");
    expect(
      within(screen.getByRole("region", { name: "Manoel" })).getByText(
        "Nenhum agendamento.",
      ),
    ).toBeInTheDocument();
  });

  it("a semana pede segunda a domingo e mostra cada dia com o barbeiro", async () => {
    respond({
      agenda: agendaWeek({
        appointments: [
          adminAppointment({
            id: 9,
            starts_at: "2026-11-07T09:00:00-03:00",
            ends_at: "2026-11-07T09:45:00-03:00",
          }),
        ],
      }),
    });

    await renderPage({ data: "2026-11-05", visao: "semana" });

    expect(agendaQuery()).toEqual({
      start: "2026-11-02",
      end: "2026-11-08",
      barber_id: undefined,
    });
    expect(
      screen.getByRole("heading", { level: 2, name: "Semana de 2 a 8 de nov" }),
    ).toBeInTheDocument();
    const days = screen
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent);
    expect(days).toEqual([
      "Seg, 2 de nov",
      "Ter, 3 de nov",
      "Qua, 4 de nov",
      "Qui, 5 de nov",
      "Sex, 6 de nov",
      "Sáb, 7 de nov",
      "Dom, 8 de nov",
    ]);
    const saturday = screen.getByRole("region", { name: "Sáb, 7 de nov" });
    expect(within(saturday).getByText("09:00 às 14:00")).toBeInTheDocument();
    expect(within(saturday).getByRole("link")).toHaveTextContent(
      "Corte + Barba · Edvaldo",
    );
    expect(
      within(screen.getByRole("region", { name: "Dom, 8 de nov" })).getByText(
        "Fechado",
      ),
    ).toBeInTheDocument();
  });

  it("navega e filtra por links que mantêm o estado, sem JS", async () => {
    respond({
      agenda: agendaWeek({ barbers: [agendaBarbers[1]] }),
    });

    await renderPage({ data: "2026-11-05", visao: "semana", barbeiro: "2" });

    expect(agendaQuery()?.barber_id).toBe(2);
    const period = screen.getByRole("navigation", { name: "Período" });
    expect(
      within(period).getByRole("link", { name: "Anterior semana" }),
    ).toHaveAttribute(
      "href",
      "/admin/agenda?data=2026-10-29&visao=semana&barbeiro=2",
    );
    expect(within(period).getByRole("link", { name: "Hoje" })).toHaveAttribute(
      "href",
      "/admin/agenda?data=2026-11-03&visao=semana&barbeiro=2",
    );
    expect(
      within(period).getByRole("link", { name: "Próximo semana" }),
    ).toHaveAttribute(
      "href",
      "/admin/agenda?data=2026-11-12&visao=semana&barbeiro=2",
    );

    const view = screen.getByRole("navigation", { name: "Visão" });
    expect(within(view).getByRole("link", { name: "Dia" })).toHaveAttribute(
      "href",
      "/admin/agenda?data=2026-11-05&barbeiro=2",
    );
    expect(within(view).getByRole("link", { name: "Semana" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    const filter = screen.getByRole("navigation", { name: "Barbeiro" });
    expect(within(filter).getByRole("link", { name: "Todos" })).toHaveAttribute(
      "href",
      "/admin/agenda?data=2026-11-05&visao=semana",
    );
    expect(within(filter).getByRole("link", { name: "Lauro" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      within(filter).getByRole("link", { name: "Manoel" }),
    ).toHaveAttribute(
      "href",
      "/admin/agenda?data=2026-11-05&visao=semana&barbeiro=3",
    );

    const field = screen.getByLabelText("Ir para a data");
    expect(field).toHaveAttribute("type", "date");
    expect(field).toHaveValue("2026-11-05");
    const form = field.closest("form");
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/admin/agenda");
    expect(form?.querySelector('input[name="visao"]')).toHaveValue("semana");
    expect(form?.querySelector('input[name="barbeiro"]')).toHaveValue("2");
  });

  it("o filtro mostra os ativos e o inativo escolhido", async () => {
    respond({
      agenda: agendaDay({
        barbers: [{ id: 4, name: "Caio", active: false }],
      }),
      barbers: [
        { id: 1, name: "Edvaldo", active: true, photo_path: null, bio: null },
        { id: 4, name: "Caio", active: false, photo_path: null, bio: null },
        { id: 5, name: "Davi", active: false, photo_path: null, bio: null },
      ],
    });

    await renderPage({ barbeiro: "4" });

    const filter = screen.getByRole("navigation", { name: "Barbeiro" });
    expect(
      within(filter)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["Todos", "Edvaldo", "Caio"]);
    const caio = screen.getByRole("region", { name: "Caio" });
    expect(within(caio).getByText("Inativo")).toBeInTheDocument();
    expect(within(caio).getByText("Nenhum agendamento.")).toBeInTheDocument();
  });

  it("mostra o message da API quando ela recusa", async () => {
    GET.mockImplementation((path: string) =>
      Promise.resolve(
        path === "/admin/barbers"
          ? { data: [], response: { status: 200 } }
          : {
              error: {
                code: "BARBER_NOT_FOUND",
                message: "Barbeiro não encontrado.",
              },
              response: { status: 404 },
            },
      ),
    );

    await renderPage({ barbeiro: "99" });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Barbeiro não encontrado.",
    );
  });

  it("avisa quando a API falha", async () => {
    GET.mockRejectedValue(new TypeError("fetch failed"));

    await renderPage();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível carregar a agenda. Tente novamente em instantes.",
    );
    // A barra continua, para a pessoa tentar outro dia.
    expect(screen.getByRole("link", { name: "Hoje" })).toBeInTheDocument();
  });
});
