import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api/client";
import { agendaBarbers, agendaDay, agendaWeek } from "@/test/agenda-data";
import { dayOff, timeBlock } from "@/test/time-block-data";
import AgendaPage from "../page";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/api/client", () => ({ createApiClient: vi.fn() }));

const GET = vi.fn();

function respond({
  agenda = agendaDay(),
  blocks = [timeBlock(), dayOff()] as unknown,
}: { agenda?: unknown; blocks?: unknown } = {}) {
  GET.mockImplementation((path: string) => {
    if (path === "/admin/time-blocks") {
      return blocks instanceof Error
        ? Promise.reject(blocks)
        : Promise.resolve({ data: blocks, response: { status: 200 } });
    }
    if (path === "/admin/barbers") {
      return Promise.resolve({
        data: agendaBarbers.map((barber) => ({
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

function blocksQuery() {
  const call = GET.mock.calls.find(([path]) => path === "/admin/time-blocks");
  return call?.[1].params.query;
}

describe("bloqueios na agenda — RN-03", () => {
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

  it("no dia, cada barbeiro mostra os bloqueios depois dos agendamentos", async () => {
    await renderPage();

    expect(blocksQuery()).toEqual({
      start: "2026-11-03",
      end: "2026-11-03",
      barber_id: undefined,
    });
    const edvaldo = screen.getByRole("region", { name: "Edvaldo" });
    expect(
      within(edvaldo).getByRole("heading", { level: 4, name: "Bloqueios" }),
    ).toBeInTheDocument();
    expect(within(edvaldo).getByText("12:00–13:00")).toBeInTheDocument();
    expect(within(edvaldo).getByText("Almoço")).toBeInTheDocument();
    expect(
      within(edvaldo).getByText("Nenhum agendamento."),
    ).toBeInTheDocument();
    expect(
      within(edvaldo).getByRole("link", {
        name: "Remover o bloqueio de Edvaldo, terça-feira, 3 de novembro de 2026, 12:00–13:00",
      }),
    ).toHaveAttribute(
      "href",
      "/admin/agenda/bloqueios/21/remover?data=2026-11-03",
    );

    const lauro = screen.getByRole("region", { name: "Lauro" });
    expect(within(lauro).getByText("Dia inteiro")).toBeInTheDocument();
    expect(within(lauro).getByText("Folga")).toBeInTheDocument();

    const manoel = screen.getByRole("region", { name: "Manoel" });
    expect(within(manoel).queryByText("Bloqueios")).not.toBeInTheDocument();
  });

  it("na semana, cada dia mostra os bloqueios com o barbeiro", async () => {
    respond({
      agenda: agendaWeek(),
      blocks: [
        timeBlock({
          starts_at: "2026-11-05T12:00:00-03:00",
          ends_at: "2026-11-05T13:00:00-03:00",
        }),
      ],
    });

    await renderPage({ data: "2026-11-05", visao: "semana" });

    expect(blocksQuery()).toEqual({
      start: "2026-11-02",
      end: "2026-11-08",
      barber_id: undefined,
    });
    const thursday = screen.getByRole("region", { name: "Qui, 5 de nov" });
    expect(within(thursday).getByText("12:00–13:00")).toBeInTheDocument();
    expect(within(thursday).getByText("Edvaldo")).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Ter, 3 de nov" })).queryByText(
        "Bloqueios",
      ),
    ).not.toBeInTheDocument();
  });

  it("com o filtro de barbeiro, pede só os bloqueios dele", async () => {
    respond({ agenda: agendaDay({ barbers: [agendaBarbers[0]] }) });

    await renderPage({ barbeiro: "1" });

    expect(blocksQuery()?.barber_id).toBe(1);
  });

  it("a barra leva a Bloquear horário com o estado da agenda", async () => {
    await renderPage({ data: "2026-11-05", visao: "semana", barbeiro: "2" });

    expect(
      screen.getByRole("link", { name: "Bloquear horário" }),
    ).toHaveAttribute(
      "href",
      "/admin/agenda/bloqueios/novo?data=2026-11-05&visao=semana&barbeiro=2",
    );
  });

  it("mostra o aviso de quem voltou de um bloqueio, só os conhecidos", async () => {
    await renderPage({ aviso: "bloqueado" });
    expect(screen.getByRole("status")).toHaveTextContent("Horário bloqueado.");
  });

  it("ignora aviso desconhecido", async () => {
    await renderPage({ aviso: "<script>" });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("falha nos bloqueios não derruba a agenda", async () => {
    respond({ blocks: new TypeError("fetch failed") });

    await renderPage();

    expect(screen.getByRole("status")).toHaveTextContent(
      "Não foi possível carregar os bloqueios.",
    );
    expect(screen.getByRole("region", { name: "Edvaldo" })).toBeInTheDocument();
  });
});
