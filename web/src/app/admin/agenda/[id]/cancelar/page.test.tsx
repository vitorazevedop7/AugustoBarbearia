import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api/client";
import { adminAppointment } from "@/test/agenda-data";
import CancelAdminAppointmentPage from "./page";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/api/client", () => ({ createApiClient: vi.fn() }));
vi.mock("../../admin-booking-actions", () => ({
  cancelAdminAppointment: vi.fn(),
}));

const GET = vi.fn();

async function renderPage(id = "7") {
  render(await CancelAdminAppointmentPage({ params: Promise.resolve({ id }) }));
}

describe("cancelar pela administração — /admin/agenda/[id]/cancelar (RN-22)", () => {
  beforeEach(() => {
    GET.mockReset().mockResolvedValue({ data: adminAppointment() });
    vi.mocked(createApiClient).mockReturnValue({ GET } as never);
  });

  it("mostra o resumo, Voltar antes do botão danger", async () => {
    await renderPage();

    expect(screen.getByText("Ana Souza")).toBeInTheDocument();
    expect(
      screen.getByText("O horário fica livre na hora."),
    ).toBeInTheDocument();
    const back = screen.getByRole("link", { name: "Voltar" });
    const submit = screen.getByRole("button", { name: "Cancelar agendamento" });
    expect(back).toHaveAttribute("href", "/admin/agenda/7?data=2026-11-03");
    expect(
      back.compareDocumentPosition(submit) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("agendamento que não está ativo não tem o botão", async () => {
    GET.mockResolvedValue({ data: adminAppointment({ status: "COMPLETED" }) });

    await renderPage();

    expect(
      screen.getByText("Este agendamento não está mais ativo."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Cancelar agendamento" }),
    ).not.toBeInTheDocument();
  });

  it("id inválido nem chama a API", async () => {
    await renderPage("abc");

    expect(GET).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Agendamento não encontrado.",
    );
  });
});
