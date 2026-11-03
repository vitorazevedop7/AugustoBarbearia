import { render, screen, within } from "@testing-library/react";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api/client";
import {
  getAvailableDays,
  getAvailableSlots,
  getPublicBarbers,
  getPublicServices,
} from "@/lib/api/public";
import { getCurrentSession } from "@/lib/session";
import { barbers, service, services } from "@/test/vitrine-data";
import BookingPage from "./page";

vi.mock("@/lib/api/public", () => ({
  getPublicBarbers: vi.fn(),
  getPublicServices: vi.fn(),
  getAvailableDays: vi.fn(),
  getAvailableSlots: vi.fn(),
}));
vi.mock("@/lib/api/client", () => ({ createApiClient: vi.fn() }));
vi.mock("@/lib/session", () => ({
  getCurrentSession: vi.fn(),
  safeRedirectPath: (value: string) => value,
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("./actions", () => ({ confirmBooking: vi.fn() }));

const GET = vi.fn();
const unavailable =
  "Não foi possível carregar os horários. Tente novamente em instantes.";
const slots = [
  {
    starts_at: "2026-11-03T10:00:00-03:00",
    ends_at: "2026-11-03T10:45:00-03:00",
  },
  {
    starts_at: "2026-11-03T11:30:00-03:00",
    ends_at: "2026-11-03T12:15:00-03:00",
  },
  {
    starts_at: "2026-11-03T14:00:00-03:00",
    ends_at: "2026-11-03T14:45:00-03:00",
  },
];
const CONFIRM = {
  barbeiro: "1",
  servico: "2",
  data: "2026-11-03",
  hora: "10:00",
};

async function renderPage(params: Record<string, string> = {}) {
  render(await BookingPage({ searchParams: Promise.resolve(params) } as never));
}

function links(container: HTMLElement = document.body) {
  return within(container)
    .getAllByRole("link")
    .map((link) => [link.textContent, link.getAttribute("href")]);
}

describe("agendamento — fluxo /agendar (D11)", () => {
  beforeEach(() => {
    vi.mocked(getPublicBarbers).mockReset().mockResolvedValue(barbers);
    vi.mocked(getPublicServices).mockReset().mockResolvedValue(services);
    vi.mocked(getAvailableDays)
      .mockReset()
      .mockResolvedValue(["2026-11-03", "2026-11-04", "2026-12-01"]);
    vi.mocked(getAvailableSlots).mockReset().mockResolvedValue(slots);
    vi.mocked(getCurrentSession)
      .mockReset()
      .mockResolvedValue({ user: { id: "cliente" } } as never);
    GET.mockReset().mockResolvedValue({
      data: {
        sub: "cliente",
        email: "ana@example.com",
        name: "Ana",
        role: "customer",
        has_phone: true,
      },
      response: { status: 200 },
    });
    vi.mocked(createApiClient).mockReturnValue({ GET } as never);
    vi.mocked(redirect)
      .mockReset()
      .mockImplementation((destination) => {
        throw new Error(`REDIRECT:${destination}`);
      });
  });

  it("etapa 1: escolhe o barbeiro, sem login", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(null);

    await renderPage();

    expect(screen.getByText("Etapa 1 de 5 · Barbeiro")).toBeVisible();
    expect(
      screen.getByRole("heading", { level: 1, name: "Escolha o barbeiro" }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Edvaldo" }).getAttribute("href"),
    ).toBe("/agendar?barbeiro=1");
    expect(screen.getAllByRole("link")).toHaveLength(3);
    expect(getCurrentSession).not.toHaveBeenCalled();
  });

  it("entrada pelo card do serviço: só os barbeiros que o realizam, e o serviço segue escolhido", async () => {
    vi.mocked(getPublicServices).mockResolvedValue([
      service(2, "Barba", {
        barbers: [
          { id: 1, name: "Edvaldo" },
          { id: 3, name: "Manoel" },
        ],
      }),
    ]);

    await renderPage({ servico: "2" });

    expect(screen.getByText("Etapa 1 de 5 · Barbeiro")).toBeVisible();
    expect(screen.getAllByRole("link")).toHaveLength(3);
    expect(
      screen.getByRole("link", { name: "Trocar serviço" }),
    ).toHaveAttribute("href", "/agendar");
    expect(screen.getByRole("link", { name: "Edvaldo" })).toHaveAttribute(
      "href",
      "/agendar?barbeiro=1&servico=2",
    );
    expect(screen.getByRole("link", { name: "Manoel" })).toHaveAttribute(
      "href",
      "/agendar?barbeiro=3&servico=2",
    );
  });

  it("etapa 2: só os serviços que o barbeiro realiza (entrada pelo card do barbeiro)", async () => {
    vi.mocked(getPublicServices).mockResolvedValue([
      service(2, "Corte + Barba", {
        price: "35.00",
        duration_minutes: 45,
      }),
      service(4, "Pigmentação", { barbers: [{ id: 2, name: "Lauro" }] }),
    ]);

    await renderPage({ barbeiro: "1" });

    expect(screen.getByText("Etapa 2 de 5 · Serviço")).toBeVisible();
    const option = screen.getByRole("link", { name: /Corte \+ Barba/ });
    expect(option).toHaveAttribute("href", "/agendar?barbeiro=1&servico=2");
    expect(option).toHaveTextContent("Duração: 45 min");
    expect(option).toHaveTextContent("Preço: R$ 35,00");
    expect(screen.queryByText("Pigmentação")).toBeNull();
    expect(screen.getByText("Edvaldo")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Trocar barbeiro" }),
    ).toHaveAttribute("href", "/agendar");
  });

  it("ignora o serviço que o barbeiro não realiza e volta para a etapa 2", async () => {
    vi.mocked(getPublicServices).mockResolvedValue([
      service(4, "Pigmentação", { barbers: [{ id: 2, name: "Lauro" }] }),
    ]);

    await renderPage({ barbeiro: "1", servico: "4", data: "2026-11-03" });

    expect(screen.getByText("Etapa 2 de 5 · Serviço")).toBeVisible();
    expect(
      screen.getByText("Edvaldo não tem serviços disponíveis"),
    ).toBeVisible();
    expect(getAvailableDays).not.toHaveBeenCalled();
  });

  it("ignora barbeiro que não está na vitrine", async () => {
    await renderPage({ barbeiro: "99" });

    expect(screen.getByText("Etapa 1 de 5 · Barbeiro")).toBeVisible();
  });

  it("etapa 3: os dias que a API devolveu, por mês", async () => {
    await renderPage({ barbeiro: "1", servico: "2" });

    expect(screen.getByText("Etapa 3 de 5 · Dia")).toBeVisible();
    expect(getAvailableDays).toHaveBeenCalledWith(1, 2);
    expect(
      screen.getByRole("heading", { level: 2, name: "Novembro de 2026" }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "terça-feira, 3 de novembro de 2026" }),
    ).toHaveAttribute("href", "/agendar?barbeiro=1&servico=2&data=2026-11-03");
    expect(
      screen.getByRole("heading", { level: 2, name: "Dezembro de 2026" }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Trocar serviço" }),
    ).toHaveAttribute("href", "/agendar?barbeiro=1");
  });

  it("etapa 3 sem dia livre: estado vazio", async () => {
    vi.mocked(getAvailableDays).mockResolvedValue([]);

    await renderPage({ barbeiro: "1", servico: "2" });

    expect(screen.getByText("Nenhum dia com horário livre")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Escolher outro barbeiro" }),
    ).toHaveAttribute("href", "/agendar");
  });

  it("etapa 4: os horários do dia em Manhã e Tarde", async () => {
    await renderPage({ barbeiro: "1", servico: "2", data: "2026-11-03" });

    expect(screen.getByText("Etapa 4 de 5 · Horário")).toBeVisible();
    expect(getAvailableSlots).toHaveBeenCalledWith(1, 2, "2026-11-03");
    const morning = screen.getByRole("region", { name: "Manhã" });
    expect(links(morning)).toEqual([
      ["10:00", "/agendar?barbeiro=1&servico=2&data=2026-11-03&hora=10:00"],
      ["11:30", "/agendar?barbeiro=1&servico=2&data=2026-11-03&hora=11:30"],
    ]);
    const afternoon = screen.getByRole("region", { name: "Tarde" });
    expect(links(afternoon)).toEqual([
      ["14:00", "/agendar?barbeiro=1&servico=2&data=2026-11-03&hora=14:00"],
    ]);
    expect(
      screen.getByText("terça-feira, 3 de novembro de 2026"),
    ).toBeVisible();
  });

  it("etapa 4 sem horário: estado vazio com outro dia", async () => {
    vi.mocked(getAvailableSlots).mockResolvedValue([]);

    await renderPage({ barbeiro: "1", servico: "2", data: "2026-11-03" });

    expect(screen.getByText("Não há horários livres neste dia")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Escolher outro dia" }),
    ).toHaveAttribute("href", "/agendar?barbeiro=1&servico=2");
  });

  it.each([
    ["barbeiros e serviços", { barbeiro: "1" }, "public"],
    ["dias", { barbeiro: "1", servico: "2" }, "days"],
    ["horários", { barbeiro: "1", servico: "2", data: "2026-11-03" }, "slots"],
  ])("avisa quando a API não responde (%s)", async (_, params, which) => {
    if (which === "public")
      vi.mocked(getPublicServices).mockResolvedValue(null);
    if (which === "days") vi.mocked(getAvailableDays).mockResolvedValue(null);
    if (which === "slots") vi.mocked(getAvailableSlots).mockResolvedValue(null);

    await renderPage(params);

    expect(screen.getByRole("alert")).toHaveTextContent(unavailable);
  });

  it("confirmação sem login: leva ao login e volta para a mesma confirmação", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(null);

    await expect(renderPage(CONFIRM)).rejects.toThrow(
      `REDIRECT:/entrar?voltar=${encodeURIComponent(
        "/agendar?barbeiro=1&servico=2&data=2026-11-03&hora=10:00",
      )}`,
    );
    expect(GET).not.toHaveBeenCalled();
  });

  it("confirmação: resumo completo, aviso das 2 horas e o botão", async () => {
    await renderPage(CONFIRM);

    expect(screen.getByText("Etapa 5 de 5 · Confirmação")).toBeVisible();
    expect(
      screen.getByRole("heading", { level: 1, name: "Confirme o agendamento" }),
    ).toBeVisible();
    expect(GET).toHaveBeenCalledWith("/me", {
      signal: expect.any(AbortSignal),
    });
    expect(screen.getByText("Corte + Barba · 45 min · R$ 35,00")).toBeVisible();
    expect(screen.getByText("10:00 às 10:45")).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Você pode cancelar ou remarcar até 2 horas antes do horário.",
    );
    expect(screen.queryByLabelText("Telefone")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Confirmar agendamento" }),
    ).toBeEnabled();
    expect(document.querySelector('input[name="starts_at"]')).toHaveValue(
      "2026-11-03T10:00:00-03:00",
    );
    expect(
      screen.getByRole("link", { name: "Trocar horário" }),
    ).toHaveAttribute("href", "/agendar?barbeiro=1&servico=2&data=2026-11-03");
  });

  it("confirmação sem telefone no perfil pede o telefone (RN-10)", async () => {
    GET.mockResolvedValue({
      data: {
        sub: "cliente",
        email: "ana@example.com",
        name: "Ana",
        role: "customer",
        has_phone: false,
      },
      response: { status: 200 },
    });

    await renderPage(CONFIRM);

    expect(screen.getByLabelText("Telefone")).toHaveAttribute("type", "tel");
  });

  it("confirmação de um horário que já não está livre", async () => {
    vi.mocked(getAvailableSlots).mockResolvedValue(slots.slice(1));

    await renderPage(CONFIRM);

    expect(
      screen.getByText("Este horário não está mais disponível."),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Confirmar agendamento" }),
    ).toBeNull();
    expect(
      screen.getByRole("link", { name: "Escolher outro horário" }),
    ).toHaveAttribute("href", "/agendar?barbeiro=1&servico=2&data=2026-11-03");
  });

  it("a administração é levada ao agendamento da agenda, com as escolhas (RN-70)", async () => {
    GET.mockResolvedValue({
      data: {
        sub: "admin",
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
        has_phone: false,
      },
      response: { status: 200 },
    });

    await renderPage(CONFIRM);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Você entrou com a conta da administração.",
    );
    expect(
      screen.getByRole("link", { name: "Agendar para um cliente" }),
    ).toHaveAttribute(
      "href",
      "/admin/agenda/novo?barbeiro=1&servico=2&data=2026-11-03&hora=10:00",
    );
    expect(
      screen.queryByRole("button", { name: "Confirmar agendamento" }),
    ).toBeNull();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("JWT recusado com sessão válida: aviso, sem ciclo de login", async () => {
    GET.mockResolvedValue({ response: { status: 401 } });

    await renderPage(CONFIRM);

    expect(screen.getByRole("alert")).toHaveTextContent(unavailable);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("mostra o message de erro da API ao ler a conta", async () => {
    GET.mockResolvedValue({
      response: { status: 409 },
      error: {
        code: "CUSTOMER_EMAIL_LINKED",
        message: "Este e-mail já está vinculado a outro cadastro.",
      },
    });

    await renderPage(CONFIRM);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Este e-mail já está vinculado a outro cadastro.",
    );
  });
});
