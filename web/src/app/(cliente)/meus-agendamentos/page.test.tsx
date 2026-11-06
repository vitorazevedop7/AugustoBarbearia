import { render, screen, within } from "@testing-library/react";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api/client";
import { getPublicShop } from "@/lib/api/public";
import { getCurrentSession } from "@/lib/session";
import {
  appointment,
  startedAppointment,
  lateChangeAppointment,
} from "@/test/appointment-data";
import { shop } from "@/test/vitrine-data";
import MyAppointmentsPage from "./page";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/api/client", () => ({ createApiClient: vi.fn() }));
vi.mock("@/lib/api/public", () => ({ getPublicShop: vi.fn() }));
vi.mock("@/lib/session", () => ({ getCurrentSession: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const GET = vi.fn();

function listed(upcoming: unknown[], history: unknown[] = []) {
  GET.mockResolvedValue({
    data: { upcoming, history },
    response: { status: 200 },
  });
}

async function renderPage(params: Record<string, string> = {}) {
  render(
    await MyAppointmentsPage({
      searchParams: Promise.resolve(params),
    } as never),
  );
}

describe("meus agendamentos — /meus-agendamentos", () => {
  beforeEach(() => {
    GET.mockReset();
    listed([]);
    vi.mocked(createApiClient).mockReturnValue({ GET } as never);
    vi.mocked(getPublicShop)
      .mockReset()
      .mockResolvedValue({
        ...shop,
        whatsapp: "75999990000",
        phone: "7532210000",
      });
    vi.mocked(getCurrentSession)
      .mockReset()
      .mockResolvedValue({ user: { id: "cliente" } } as never);
    vi.mocked(redirect)
      .mockReset()
      .mockImplementation((destination) => {
        throw new Error(`REDIRECT:${destination}`);
      });
  });

  it("sem sessão, leva ao login e volta para a lista", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(null);

    await expect(renderPage()).rejects.toThrow(
      "REDIRECT:/entrar?voltar=%2Fmeus-agendamentos",
    );
    expect(GET).not.toHaveBeenCalled();
  });

  it("a administração vai para /admin (RN-70)", async () => {
    GET.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Só clientes." },
      response: { status: 403 },
    });

    await expect(renderPage()).rejects.toThrow("REDIRECT:/admin");
  });

  it("falha da API mostra o aviso", async () => {
    GET.mockRejectedValue(new Error("rede"));

    await renderPage();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível carregar seus agendamentos. Tente novamente em instantes.",
    );
  });

  it("sem nenhum agendamento, convida a agendar", async () => {
    await renderPage();

    expect(
      screen.getByRole("heading", { level: 1, name: "Meus agendamentos" }),
    ).toBeVisible();
    expect(screen.getByText("Você ainda não tem horários")).toBeVisible();
    const book = screen.getByRole("link", { name: "Agendar horário" });
    expect(book).toHaveAttribute("href", "/agendar");
    // A ação principal da tela usa o botão `md`, de 52px.
    expect(book).toHaveClass("min-h-13");
  });

  it("próximo horário dentro do prazo: remarcar e cancelar (RN-14)", async () => {
    listed([appointment()]);

    await renderPage();

    const upcoming = screen.getByRole("region", { name: "Próximos" });
    const card = within(upcoming).getByRole("article", {
      name: "Corte + Barba",
    });
    expect(card).toHaveTextContent("terça-feira, 3 de novembro de 2026");
    expect(card).toHaveTextContent("10:00 às 10:45 (45 min)");
    expect(card).toHaveTextContent("Edvaldo");
    expect(card).toHaveTextContent("R$ 35,00");
    expect(card).toHaveTextContent("Agendado");
    // No prazo normal, sem aviso: a política fica no topo da página.
    expect(within(card).queryByRole("status")).toBeNull();
    expect(screen.getByRole("main")).toHaveTextContent(
      "Você pode remarcar ou cancelar até o horário marcado. Se puder, avise com pelo menos 2 horas de antecedência.",
    );
    expect(
      within(card).getByRole("link", {
        name: "Remarcar o horário de terça-feira, 3 de novembro de 2026",
      }),
    ).toHaveAttribute("href", "/meus-agendamentos/7/remarcar?barbeiro=1");
    expect(
      within(card).getByRole("link", {
        name: "Cancelar o horário de terça-feira, 3 de novembro de 2026",
      }),
    ).toHaveAttribute("href", "/meus-agendamentos/7/cancelar");
    expect(screen.queryByRole("region", { name: "Histórico" })).toBeNull();
  });

  it("fora do prazo, mostra o contato da barbearia no lugar das ações (RN-14)", async () => {
    listed([startedAppointment()]);

    await renderPage();

    const card = screen.getByRole("article", { name: "Corte + Barba" });
    expect(within(card).queryByRole("link", { name: /Cancelar/ })).toBeNull();
    expect(within(card).queryByRole("link", { name: /Remarcar/ })).toBeNull();
    expect(within(card).getByRole("status")).toHaveTextContent(
      "Seu horário já começou. Se você está a caminho ou não vai conseguir vir, fale com a barbearia.",
    );
    expect(
      within(card).getByRole("link", { name: "(75) 99999-0000" }),
    ).toHaveAttribute("href", "https://wa.me/5575999990000");
    expect(
      within(card).getByRole("link", { name: "(75) 3221-0000" }),
    ).toHaveAttribute("href", "tel:+557532210000");
  });

  it("fora do prazo e sem contato cadastrado, não aponta para um contato", async () => {
    vi.mocked(getPublicShop).mockResolvedValue(shop);
    listed([startedAppointment()]);

    await renderPage();

    const notice = within(
      screen.getByRole("article", { name: "Corte + Barba" }),
    ).getByRole("status");
    expect(notice).toHaveTextContent(
      /^Seu horário já começou\. Se você está a caminho ou não vai conseguir vir, fale com a barbearia\.$/,
    );
    expect(within(notice).queryByRole("link")).toBeNull();
  });

  it("histórico: cancelado por quem e o que espera registro, sem ações", async () => {
    listed(
      [],
      [
        appointment({
          id: 8,
          status: "CANCELED",
          canceled_at: "2026-11-02T08:00:00-03:00",
          canceled_by: "CUSTOMER",
          change_deadline: null,
          can_cancel: false,
          can_reschedule: false,
        }),
        startedAppointment({
          id: 9,
          service: { id: 1, name: "Corte Simples" },
          starts_at: "2026-10-30T10:00:00-03:00",
          ends_at: "2026-10-30T10:30:00-03:00",
        }),
      ],
    );

    await renderPage();

    expect(screen.getByText("Nenhum horário marcado")).toBeVisible();
    const history = screen.getByRole("region", { name: "Histórico" });
    const canceled = within(history).getByRole("article", {
      name: "Corte + Barba",
    });
    expect(canceled).toHaveTextContent("Cancelado");
    expect(canceled).toHaveTextContent(
      "Cancelado por você em segunda-feira, 2 de novembro de 2026, às 08:00.",
    );
    const waiting = within(history).getByRole("article", {
      name: "Corte Simples",
    });
    expect(waiting).toHaveTextContent("Aguardando registro");
    expect(within(history).queryAllByRole("link")).toHaveLength(0);
    expect(within(history).queryByRole("status")).toBeNull();
  });

  it("em cima da hora, mantém as ações com o aviso e os contatos (RN-14)", async () => {
    listed([lateChangeAppointment()]);

    await renderPage();

    const card = screen.getByRole("article", { name: "Corte + Barba" });
    const notice = within(card).getByRole("status");
    expect(notice).toHaveTextContent("Seu horário é daqui a pouco.");
    expect(notice).toHaveTextContent(
      "Vai só se atrasar? Fale com a barbearia antes de cancelar",
    );
    expect(
      within(notice).getByRole("link", { name: "(75) 99999-0000" }),
    ).toBeVisible();
    expect(within(card).getByRole("link", { name: /Remarcar/ })).toBeVisible();
    expect(within(card).getByRole("link", { name: /Cancelar/ })).toBeVisible();
  });

  it.each([
    [
      "cancelado-em-cima",
      "Agendamento cancelado. Obrigado por avisar: assim o barbeiro não fica te esperando.",
    ],
    ["remarcado-em-cima", "Agendamento remarcado. Obrigado por avisar."],
  ])("aviso em cima da hora (%s)", async (aviso, message) => {
    listed([]);

    await renderPage({ aviso });

    expect(screen.getAllByRole("status")[0]).toHaveTextContent(message);
  });

  it("depois de cancelar ou remarcar, mostra o aviso", async () => {
    listed([appointment()]);

    await renderPage({ aviso: "remarcado" });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Agendamento remarcado.",
    );
  });
});
