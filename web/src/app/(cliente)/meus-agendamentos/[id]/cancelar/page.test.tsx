import { render, screen } from "@testing-library/react";
import { notFound, redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api/client";
import { getPublicShop } from "@/lib/api/public";
import { getCurrentSession } from "@/lib/session";
import {
  appointment,
  lateChangeAppointment,
  startedAppointment,
} from "@/test/appointment-data";
import { shop } from "@/test/vitrine-data";
import CancelAppointmentPage from "./page";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/api/client", () => ({ createApiClient: vi.fn() }));
vi.mock("@/lib/api/public", () => ({ getPublicShop: vi.fn() }));
vi.mock("@/lib/session", () => ({ getCurrentSession: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), notFound: vi.fn() }));
vi.mock("../../actions", () => ({ cancelAppointment: vi.fn() }));

const GET = vi.fn();

async function renderPage(id = "7") {
  render(
    await CancelAppointmentPage({ params: Promise.resolve({ id }) } as never),
  );
}

describe("cancelar agendamento — /meus-agendamentos/[id]/cancelar", () => {
  beforeEach(() => {
    GET.mockReset().mockResolvedValue({
      data: appointment(),
      response: { status: 200 },
    });
    vi.mocked(createApiClient).mockReturnValue({ GET } as never);
    vi.mocked(getPublicShop)
      .mockReset()
      .mockResolvedValue({ ...shop, phone: "7532210000" });
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

  it("confirma com o resumo, o Voltar antes e o botão danger, sem JS", async () => {
    await renderPage();

    expect(GET).toHaveBeenCalledWith("/me/appointments/{appointment_id}", {
      params: { path: { appointment_id: 7 } },
      signal: expect.any(AbortSignal),
    });
    expect(
      screen.getByRole("heading", { level: 1, name: "Cancelar agendamento" }),
    ).toBeVisible();
    expect(screen.getByText("Corte + Barba · 45 min · R$ 35,00")).toBeVisible();
    expect(
      screen.getByText("terça-feira, 3 de novembro de 2026"),
    ).toBeVisible();
    expect(screen.getByText("10:00 às 10:45")).toBeVisible();
    expect(
      screen.getByText("O horário fica livre para outros clientes."),
    ).toBeVisible();
    const back = screen.getByRole("link", { name: "Voltar" });
    const submit = screen.getByRole("button", {
      name: "Cancelar agendamento",
    });
    expect(back).toHaveAttribute("href", "/meus-agendamentos");
    expect(submit).toHaveAttribute("type", "submit");
    expect(
      back.compareDocumentPosition(submit) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    const form = submit.closest("form");
    expect(form?.querySelector('input[name="appointment_id"]')).toHaveValue(
      "7",
    );
  });

  it("fora do prazo, mostra o contato e nenhum botão (RN-14)", async () => {
    GET.mockResolvedValue({
      data: startedAppointment(),
      response: { status: 200 },
    });

    await renderPage();

    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Seu horário já começou.",
    );
    expect(screen.getByRole("link", { name: "(75) 3221-0000" })).toBeVisible();
  });

  it("em cima da hora, ainda cancela, com o aviso e o Manter meu horário (RN-14)", async () => {
    GET.mockResolvedValue({
      data: lateChangeAppointment(),
      response: { status: 200 },
    });

    await renderPage();

    const notice = screen.getByRole("status");
    expect(notice).toHaveTextContent(
      "Faltam menos de 2 horas para o seu horário.",
    );
    expect(notice).toHaveTextContent("o Edvaldo já está contando com você");
    expect(screen.getByRole("link", { name: "(75) 3221-0000" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Cancelar mesmo assim" }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Manter meu horário" }),
    ).toHaveAttribute("href", "/meus-agendamentos");
  });

  it("agendamento que não está ativo não pode ser cancelado (RN-31)", async () => {
    GET.mockResolvedValue({
      data: appointment({
        status: "CANCELED",
        can_cancel: false,
        can_reschedule: false,
      }),
      response: { status: 200 },
    });

    await renderPage();

    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Este agendamento não está mais ativo.",
    );
  });

  it("agendamento de outro cliente mostra o message da API (RN-16)", async () => {
    GET.mockResolvedValue({
      error: {
        code: "APPOINTMENT_NOT_FOUND",
        message: "Agendamento não encontrado.",
      },
      response: { status: 404 },
    });

    await renderPage();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Agendamento não encontrado.",
    );
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("id inválido é 404, e sem sessão leva ao login com volta", async () => {
    await expect(renderPage("abc")).rejects.toThrow("NOT_FOUND");

    vi.mocked(getCurrentSession).mockResolvedValue(null);
    await expect(renderPage()).rejects.toThrow(
      "REDIRECT:/entrar?voltar=%2Fmeus-agendamentos%2F7%2Fcancelar",
    );
  });
});
