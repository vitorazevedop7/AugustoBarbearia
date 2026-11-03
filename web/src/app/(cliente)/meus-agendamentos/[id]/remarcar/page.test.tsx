import { render, screen } from "@testing-library/react";
import { notFound, redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api/client";
import {
  getPublicBarbers,
  getPublicServices,
  getPublicShop,
} from "@/lib/api/public";
import { getCurrentSession } from "@/lib/session";
import {
  appointment,
  lateChangeAppointment,
  startedAppointment,
} from "@/test/appointment-data";
import { barbers, service, shop } from "@/test/vitrine-data";
import RescheduleAppointmentPage from "./page";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/api/client", () => ({ createApiClient: vi.fn() }));
vi.mock("@/lib/api/public", () => ({
  getPublicShop: vi.fn(),
  getPublicBarbers: vi.fn(),
  getPublicServices: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ getCurrentSession: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), notFound: vi.fn() }));
vi.mock("../../actions", () => ({ rescheduleAppointment: vi.fn() }));

const GET = vi.fn();
const slots = [
  {
    starts_at: "2026-11-04T10:30:00-03:00",
    ends_at: "2026-11-04T11:15:00-03:00",
  },
  {
    starts_at: "2026-11-04T14:00:00-03:00",
    ends_at: "2026-11-04T14:45:00-03:00",
  },
];

/** Responde cada rota `/me` como a API. */
function api(overrides: Record<string, unknown> = {}) {
  const routes: Record<string, unknown> = {
    "/me/appointments/{appointment_id}": {
      data: appointment(),
      response: { status: 200 },
    },
    "/me/appointments/{appointment_id}/availability/days": {
      data: {
        barber_id: 1,
        service_id: 2,
        days: ["2026-11-03", "2026-11-04"],
      },
      response: { status: 200 },
    },
    "/me/appointments/{appointment_id}/availability": {
      data: { barber_id: 1, service_id: 2, date: "2026-11-04", slots },
      response: { status: 200 },
    },
    ...overrides,
  };
  GET.mockImplementation(async (path: string) => routes[path]);
}

async function renderPage(params: Record<string, string> = {}, id = "7") {
  render(
    await RescheduleAppointmentPage({
      params: Promise.resolve({ id }),
      searchParams: Promise.resolve(params),
    } as never),
  );
}

describe("remarcar agendamento — /meus-agendamentos/[id]/remarcar (RN-15)", () => {
  beforeEach(() => {
    GET.mockReset();
    api();
    vi.mocked(createApiClient).mockReturnValue({ GET } as never);
    vi.mocked(getPublicShop)
      .mockReset()
      .mockResolvedValue({ ...shop, whatsapp: "75999990000" });
    vi.mocked(getPublicBarbers).mockReset().mockResolvedValue(barbers);
    vi.mocked(getPublicServices)
      .mockReset()
      .mockResolvedValue([
        service(2, "Corte + Barba", {
          barbers: [
            { id: 1, name: "Edvaldo" },
            { id: 2, name: "Lauro" },
          ],
        }),
      ]);
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

  it("etapa 1: só os barbeiros que realizam o serviço", async () => {
    await renderPage();

    expect(screen.getByText("Etapa 1 de 4 · Barbeiro")).toBeVisible();
    expect(screen.getByText("Ter, 3 de nov · 10:00 · Edvaldo")).toBeVisible();
    expect(screen.getByRole("link", { name: "Lauro" })).toHaveAttribute(
      "href",
      "/meus-agendamentos/7/remarcar?barbeiro=2",
    );
    expect(screen.queryByRole("link", { name: "Manoel" })).toBeNull();
  });

  it("etapa 2: os dias da rota da remarcação, com o barbeiro atual", async () => {
    await renderPage({ barbeiro: "1" });

    expect(screen.getByText("Etapa 2 de 4 · Dia")).toBeVisible();
    expect(GET).toHaveBeenCalledWith(
      "/me/appointments/{appointment_id}/availability/days",
      {
        params: { path: { appointment_id: 7 }, query: { barber_id: 1 } },
        signal: expect.any(AbortSignal),
      },
    );
    expect(
      screen.getByRole("link", { name: "quarta-feira, 4 de novembro de 2026" }),
    ).toHaveAttribute(
      "href",
      "/meus-agendamentos/7/remarcar?barbeiro=1&data=2026-11-04",
    );
    expect(
      screen.getByRole("link", { name: "Trocar barbeiro" }),
    ).toHaveAttribute("href", "/meus-agendamentos/7/remarcar");
  });

  it("etapa 3: os horários do dia, inclusive o que cruza o atual", async () => {
    await renderPage({ barbeiro: "1", data: "2026-11-04" });

    expect(screen.getByText("Etapa 3 de 4 · Horário")).toBeVisible();
    expect(screen.getByRole("link", { name: "10:30" })).toHaveAttribute(
      "href",
      "/meus-agendamentos/7/remarcar?barbeiro=1&data=2026-11-04&hora=10:30",
    );
  });

  it("etapa 4: confirma o novo horário com o formulário", async () => {
    await renderPage({ barbeiro: "2", data: "2026-11-04", hora: "10:30" });

    expect(
      screen.getByRole("heading", { level: 1, name: "Confirme a remarcação" }),
    ).toBeVisible();
    expect(screen.getByText("10:30 às 11:15")).toBeVisible();
    expect(screen.getByText("Lauro")).toBeVisible();
    const submit = screen.getByRole("button", {
      name: "Confirmar remarcação",
    });
    const form = submit.closest("form");
    expect(form?.querySelector('input[name="starts_at"]')).toHaveValue(
      "2026-11-04T10:30:00-03:00",
    );
    expect(form?.querySelector('input[name="barber_id"]')).toHaveValue("2");
    expect(form?.querySelector('input[name="service_id"]')).toBeNull();
  });

  it("horário que já não está livre avisa, sem o botão", async () => {
    await renderPage({ barbeiro: "1", data: "2026-11-04", hora: "16:00" });

    expect(screen.queryByRole("button")).toBeNull();
    expect(
      screen.getByText("Este horário não está mais disponível."),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Escolher outro horário" }),
    ).toHaveAttribute(
      "href",
      "/meus-agendamentos/7/remarcar?barbeiro=1&data=2026-11-04",
    );
  });

  it.each<Record<string, string>>([
    { barbeiro: "1" },
    { barbeiro: "2", data: "2026-11-04", hora: "10:30" },
  ])(
    "em cima da hora, avisa no topo do fluxo e na confirmação (RN-14): %j",
    async (params) => {
      api({
        "/me/appointments/{appointment_id}": {
          data: lateChangeAppointment(),
          response: { status: 200 },
        },
      });

      await renderPage(params);

      expect(
        screen.getByText("Faltam menos de 2 horas para o seu horário."),
      ).toBeVisible();
      expect(screen.getByRole("main")).toHaveTextContent(
        "Tudo bem remarcar, imprevistos acontecem.",
      );
    },
  );

  it("fora do prazo, mostra o contato no lugar das etapas (RN-14)", async () => {
    api({
      "/me/appointments/{appointment_id}": {
        data: startedAppointment(),
        response: { status: 200 },
      },
    });

    await renderPage({ barbeiro: "1" });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Seu horário já começou.",
    );
    expect(screen.getByRole("link", { name: "(75) 99999-0000" })).toBeVisible();
    expect(GET).toHaveBeenCalledTimes(1);
  });

  it("sem dias livres, oferece outro barbeiro", async () => {
    api({
      "/me/appointments/{appointment_id}/availability/days": {
        data: { barber_id: 1, service_id: 2, days: [] },
        response: { status: 200 },
      },
    });

    await renderPage({ barbeiro: "1" });

    expect(screen.getByText("Nenhum dia com horário livre")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Escolher outro barbeiro" }),
    ).toHaveAttribute("href", "/meus-agendamentos/7/remarcar");
  });

  it("sem sessão, leva ao login voltando para a mesma etapa", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(null);

    await expect(
      renderPage({ barbeiro: "1", data: "2026-11-04" }),
    ).rejects.toThrow(
      "REDIRECT:/entrar?voltar=%2Fmeus-agendamentos%2F7%2Fremarcar%3Fbarbeiro%3D1%26data%3D2026-11-04",
    );
  });
});
