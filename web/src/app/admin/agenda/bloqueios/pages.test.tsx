import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api/client";
import { dayOff } from "@/test/time-block-data";
import RemoveTimeBlockPage from "./[id]/remover/page";
import NewTimeBlockPage from "./novo/page";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/api/client", () => ({ createApiClient: vi.fn() }));
vi.mock("./actions", () => ({
  createTimeBlock: vi.fn(),
  deleteTimeBlock: vi.fn(),
}));

const GET = vi.fn();

const barbers = [
  { id: 1, name: "Edvaldo", active: true, photo_path: null, bio: null },
  { id: 2, name: "Lauro", active: true, photo_path: null, bio: null },
  { id: 4, name: "Caio", active: false, photo_path: null, bio: null },
];

function hidden(name: string) {
  return document.querySelector(`input[type="hidden"][name="${name}"]`);
}

describe("telas dos bloqueios — RN-03", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-03T12:00:00Z"));
    GET.mockReset();
    vi.mocked(createApiClient).mockReturnValue({ GET } as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("novo bloqueio: barbeiros ativos, data e barbeiro da agenda, sem JS", async () => {
    GET.mockResolvedValue({ data: barbers, response: { status: 200 } });

    render(
      await NewTimeBlockPage({
        searchParams: Promise.resolve({
          data: "2026-11-05",
          visao: "semana",
          barbeiro: "2",
        }),
      }),
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Bloquear horário" }),
    ).toBeInTheDocument();
    const barber = screen.getByLabelText("Barbeiro");
    expect(barber).toHaveValue("2");
    expect(
      screen.getAllByRole("option").map((option) => option.textContent),
    ).toEqual(["Escolha o barbeiro", "Edvaldo", "Lauro"]);
    expect(screen.getByLabelText("Data")).toHaveValue("2026-11-05");
    expect(screen.getByLabelText("Dia inteiro")).not.toBeChecked();
    expect(screen.getByLabelText("Início")).toHaveAttribute("type", "time");
    expect(screen.getByLabelText("Início")).not.toBeRequired();
    expect(screen.getByLabelText("Fim")).not.toBeRequired();
    expect(screen.getByLabelText("Motivo (opcional)")).toHaveAttribute(
      "maxlength",
      "120",
    );
    expect(hidden("agenda_data")).toHaveValue("2026-11-05");
    expect(hidden("agenda_visao")).toHaveValue("semana");
    expect(hidden("agenda_barbeiro")).toHaveValue("2");
    expect(
      screen.getByRole("button", { name: "Bloquear horário" }),
    ).toHaveAttribute("type", "submit");
    expect(
      screen.getByRole("link", { name: "Voltar para a agenda" }),
    ).toHaveAttribute(
      "href",
      "/admin/agenda?data=2026-11-05&visao=semana&barbeiro=2",
    );
  });

  it("novo bloqueio com barbeiro inativo na agenda não escolhe ninguém", async () => {
    GET.mockResolvedValue({ data: barbers, response: { status: 200 } });

    render(
      await NewTimeBlockPage({
        searchParams: Promise.resolve({ barbeiro: "4" }),
      }),
    );

    expect(screen.getByLabelText("Barbeiro")).toHaveValue("");
    expect(screen.getByLabelText("Data")).toHaveValue("2026-11-03");
  });

  it("novo bloqueio sem os barbeiros mostra o erro e o caminho de volta", async () => {
    GET.mockRejectedValue(new TypeError("fetch failed"));

    render(await NewTimeBlockPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível carregar a agenda.",
    );
    expect(
      screen.getByRole("link", { name: "Voltar para a agenda" }),
    ).toHaveAttribute("href", "/admin/agenda?data=2026-11-03");
  });

  it("remover: resumo, aviso e Voltar antes do botão danger", async () => {
    GET.mockResolvedValue({ data: dayOff(), response: { status: 200 } });

    render(
      await RemoveTimeBlockPage({
        params: Promise.resolve({ id: "22" }),
        searchParams: Promise.resolve({ data: "2026-11-03", visao: "semana" }),
      }),
    );

    expect(GET).toHaveBeenCalledWith(
      "/admin/time-blocks/{block_id}",
      expect.objectContaining({ params: { path: { block_id: 22 } } }),
    );
    expect(screen.getByText("Lauro")).toBeInTheDocument();
    expect(
      screen.getByText("terça-feira, 3 de novembro de 2026"),
    ).toBeInTheDocument();
    expect(screen.getByText("Dia inteiro")).toBeInTheDocument();
    expect(screen.getByText("Folga")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Os horários voltam a ficar disponíveis para agendamento.",
    );
    const back = screen.getByRole("link", { name: "Voltar" });
    const remove = screen.getByRole("button", { name: "Remover bloqueio" });
    expect(back).toHaveAttribute(
      "href",
      "/admin/agenda?data=2026-11-03&visao=semana",
    );
    expect(
      back.compareDocumentPosition(remove) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(hidden("block_id")).toHaveValue("22");
    expect(hidden("agenda_visao")).toHaveValue("semana");
  });

  it("remover um bloqueio que não existe", async () => {
    GET.mockResolvedValue({
      error: {
        code: "TIME_BLOCK_NOT_FOUND",
        message: "Bloqueio não encontrado.",
      },
      response: { status: 404 },
    });

    render(
      await RemoveTimeBlockPage({
        params: Promise.resolve({ id: "99" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Bloqueio não encontrado.",
    );
    expect(
      screen.queryByRole("button", { name: "Remover bloqueio" }),
    ).not.toBeInTheDocument();
  });

  it("id inválido na URL nem chama a API", async () => {
    render(
      await RemoveTimeBlockPage({
        params: Promise.resolve({ id: "abc" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(GET).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Bloqueio não encontrado.",
    );
  });
});
