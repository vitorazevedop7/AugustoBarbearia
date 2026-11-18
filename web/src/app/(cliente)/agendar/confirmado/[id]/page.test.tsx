import { render, screen } from "@testing-library/react";
import { notFound, redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api/client";
import { getCurrentSession } from "@/lib/session";
import { appointment } from "@/test/appointment-data";
import ConfirmedPage from "./page";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/api/client", () => ({ createApiClient: vi.fn() }));
vi.mock("@/lib/session", () => ({ getCurrentSession: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), notFound: vi.fn() }));

const GET = vi.fn();

async function renderPage(id = "7") {
  render(await ConfirmedPage({ params: Promise.resolve({ id }) } as never));
}

describe("horário confirmado — /agendar/confirmado/[id] (#155)", () => {
  beforeEach(() => {
    GET.mockReset().mockResolvedValue({
      data: appointment(),
      response: { status: 200 },
    });
    vi.mocked(createApiClient).mockReturnValue({ GET } as never);
    vi.mocked(getCurrentSession)
      .mockReset()
      .mockResolvedValue({ user: { id: "cliente" } } as never);
    vi.mocked(redirect)
      .mockReset()
      .mockImplementation((destination) => {
        throw new Error(`REDIRECT:${destination}`);
      });
    vi.mocked(notFound)
      .mockReset()
      .mockImplementation(() => {
        throw new Error("NOT_FOUND");
      });
  });

  it("recarregada, mostra o mesmo horário confirmado, sem falar em 'alguém'", async () => {
    await renderPage();

    expect(GET).toHaveBeenCalledWith("/me/appointments/{appointment_id}", {
      params: { path: { appointment_id: 7 } },
      signal: expect.any(AbortSignal),
    });
    expect(
      screen.getByRole("heading", { level: 1, name: "Horário confirmado" }),
    ).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Seu horário está confirmado para terça-feira, 3 de novembro de 2026, às 10:00.",
    );
    expect(screen.getByText("Corte + Barba · 45 min")).toBeVisible();
    expect(screen.getByText("R$ 35,00")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Ver meus agendamentos" }),
    ).toHaveAttribute("href", "/meus-agendamentos");
    expect(document.body).not.toHaveTextContent("alguém");
  });

  it("cancelado depois, não promete o horário", async () => {
    GET.mockResolvedValue({
      data: appointment({ status: "CANCELED", can_cancel: false }),
      response: { status: 200 },
    });

    await renderPage();

    expect(
      screen.getByRole("heading", { level: 1, name: "Seu agendamento" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Este agendamento não está mais ativo.",
    );
    expect(document.body).not.toHaveTextContent("Horário confirmado");
  });

  it("sem sessão, leva ao login e volta para esta página", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(null);

    await expect(renderPage()).rejects.toThrow(
      "REDIRECT:/entrar?voltar=%2Fagendar%2Fconfirmado%2F7",
    );
  });

  it("de outro cliente, mostra o message da API (RN-16)", async () => {
    GET.mockResolvedValue({
      error: {
        code: "APPOINTMENT_NOT_FOUND",
        message: "Agendamento não encontrado.",
      },
      response: { status: 404 },
    });

    await renderPage();

    expect(
      screen.getByRole("heading", { level: 1, name: "Seu agendamento" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Agendamento não encontrado.",
    );
  });

  it("confirmado, oferece Adicionar ao calendário", async () => {
    await renderPage();

    expect(
      screen.getByRole("link", { name: "Adicionar ao calendário" }),
    ).toHaveAttribute("href", "/meus-agendamentos/7/calendario");
  });

  it("cancelado, não oferece o calendário (RN-31)", async () => {
    GET.mockResolvedValue({
      data: appointment({ status: "CANCELED", can_cancel: false }),
      response: { status: 200 },
    });

    await renderPage();

    expect(
      screen.queryByRole("link", { name: "Adicionar ao calendário" }),
    ).toBeNull();
  });

  it("id inválido é página não encontrada", async () => {
    await expect(renderPage("abc")).rejects.toThrow("NOT_FOUND");
  });
});
