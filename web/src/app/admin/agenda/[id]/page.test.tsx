import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api/client";
import { adminAppointment } from "@/test/agenda-data";
import AgendaAppointmentPage from "./page";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/api/client", () => ({ createApiClient: vi.fn() }));

const GET = vi.fn();

async function renderPage(id: string, params: Record<string, string> = {}) {
  render(
    await AgendaAppointmentPage({
      params: Promise.resolve({ id }),
      searchParams: Promise.resolve(params),
    }),
  );
}

describe("detalhe do agendamento — /admin/agenda/[id]", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-03T12:00:00Z"));
    GET.mockReset();
    vi.mocked(createApiClient).mockReturnValue({ GET } as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("mostra o agendamento com o cliente e volta para a mesma agenda", async () => {
    GET.mockResolvedValue({
      data: adminAppointment({ source: "ADMIN" }),
      response: { status: 200 },
    });

    await renderPage("7", {
      data: "2026-11-05",
      visao: "semana",
      barbeiro: "1",
    });

    expect(GET).toHaveBeenCalledWith("/admin/appointments/{appointment_id}", {
      params: { path: { appointment_id: 7 } },
      signal: expect.any(AbortSignal),
    });
    expect(
      screen.getByRole("heading", { level: 2, name: "Corte + Barba" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Agendado")).toBeInTheDocument();
    expect(
      screen.getByText("terça-feira, 3 de novembro de 2026"),
    ).toBeInTheDocument();
    expect(screen.getByText("10:00 às 10:45 (45 min)")).toBeInTheDocument();
    expect(screen.getByText("Edvaldo")).toBeInTheDocument();
    expect(screen.getByText("R$ 35,00")).toBeInTheDocument();
    expect(screen.getByText("Administração")).toBeInTheDocument();
    expect(screen.getByText("Ana Souza")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "(11) 98765-4321" }),
    ).toHaveAttribute("href", "tel:+5511987654321");
    expect(screen.getByText("ana@example.com")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Voltar para a agenda" }),
    ).toHaveAttribute(
      "href",
      "/admin/agenda?data=2026-11-05&visao=semana&barbeiro=1",
    );
  });

  it("diz quem cancelou e quando (RN-33)", async () => {
    GET.mockResolvedValue({
      data: adminAppointment({
        status: "CANCELED",
        canceled_at: "2026-11-02T18:30:00-03:00",
        canceled_by: "CUSTOMER",
        customer: { id: 3, name: "Ana Souza", phone: null, email: null },
      }),
      response: { status: 200 },
    });

    await renderPage("7");

    expect(
      screen.getByText(
        "Cancelado pelo cliente em segunda-feira, 2 de novembro de 2026, às 18:30.",
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Não informado")).toHaveLength(2);
    expect(
      screen.getByRole("link", { name: "Voltar para a agenda" }),
    ).toHaveAttribute("href", "/admin/agenda?data=2026-11-03");
  });

  it("mostra o message da API para o agendamento inexistente", async () => {
    GET.mockResolvedValue({
      error: {
        code: "APPOINTMENT_NOT_FOUND",
        message: "Agendamento não encontrado.",
      },
      response: { status: 404 },
    });

    await renderPage("999");

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Agendamento não encontrado.",
    );
  });

  it("id inválido nem chama a API", async () => {
    await renderPage("abc");

    expect(GET).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Agendamento não encontrado.",
    );
  });
});
