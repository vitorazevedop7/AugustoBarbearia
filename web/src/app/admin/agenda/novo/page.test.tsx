import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api/client";
import { getPublicBarbers, getPublicServices } from "@/lib/api/public";
import { barbers, services } from "@/test/vitrine-data";
import NewAppointmentPage from "./page";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/api/client", () => ({ createApiClient: vi.fn() }));
vi.mock("@/lib/api/public", () => ({
  getPublicBarbers: vi.fn(),
  getPublicServices: vi.fn(),
}));
vi.mock("../admin-booking-actions", () => ({
  createAdminAppointment: vi.fn(),
}));

const GET = vi.fn();
const slots = [
  {
    starts_at: "2026-11-02T10:00:00-03:00",
    ends_at: "2026-11-02T10:45:00-03:00",
  },
  {
    starts_at: "2026-11-02T14:00:00-03:00",
    ends_at: "2026-11-02T14:45:00-03:00",
  },
];
const chosen = {
  barbeiro: "1",
  servico: "2",
  data: "2026-11-02",
  hora: "14:00",
};

function api(overrides: Record<string, unknown> = {}) {
  const routes: Record<string, unknown> = {
    "/admin/availability/days": {
      data: { barber_id: 1, service_id: 2, days: ["2026-11-02", "2026-11-03"] },
    },
    "/admin/availability": {
      data: { barber_id: 1, service_id: 2, date: "2026-11-02", slots },
    },
    "/admin/customers": {
      data: {
        items: [
          {
            id: 9,
            name: "Ana Souza",
            phone: "11987654321",
            email: null,
            has_account: false,
          },
        ],
        total: 1,
        page: 1,
        page_size: 10,
      },
    },
    "/admin/customers/{customer_id}": {
      data: {
        id: 9,
        name: "Ana Souza",
        phone: "11987654321",
        email: null,
        has_account: false,
      },
    },
    ...overrides,
  };
  GET.mockImplementation(async (path: string) => routes[path]);
}

async function renderPage(params: Record<string, string> = {}) {
  render(await NewAppointmentPage({ searchParams: Promise.resolve(params) }));
}

describe("novo agendamento — /admin/agenda/novo (RN-20, RN-21)", () => {
  beforeEach(() => {
    GET.mockReset();
    api();
    vi.mocked(createApiClient).mockReturnValue({ GET } as never);
    vi.mocked(getPublicBarbers).mockResolvedValue(barbers);
    vi.mocked(getPublicServices).mockResolvedValue(services);
  });

  it("começa pelo barbeiro", async () => {
    await renderPage();

    expect(screen.getByText("Etapa 1 de 6 · Barbeiro")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Edvaldo/ })).toHaveAttribute(
      "href",
      "/admin/agenda/novo?barbeiro=1",
    );
    expect(
      screen.getByRole("link", { name: "Voltar para a agenda" }),
    ).toHaveAttribute("href", "/admin/agenda");
  });

  it("dia: os dias da administração e a outra data", async () => {
    await renderPage({ barbeiro: "1", servico: "2" });

    expect(GET).toHaveBeenCalledWith("/admin/availability/days", {
      params: { query: { barber_id: 1, service_id: 2 } },
      signal: expect.any(AbortSignal),
    });
    expect(
      screen.getByRole("link", {
        name: "segunda-feira, 2 de novembro de 2026",
      }),
    ).toHaveAttribute(
      "href",
      "/admin/agenda/novo?barbeiro=1&servico=2&data=2026-11-02",
    );
    expect(screen.getByLabelText("Outra data")).toBeInTheDocument();
  });

  it("horário: os horários da administração, inclusive o que já começou", async () => {
    await renderPage({ barbeiro: "1", servico: "2", data: "2026-11-02" });

    expect(screen.getByText("Etapa 4 de 6 · Horário")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "14:00" })).toHaveAttribute(
      "href",
      "/admin/agenda/novo?barbeiro=1&servico=2&data=2026-11-02&hora=14:00",
    );
  });

  it("cliente: busca e oferece o cadastro de um cliente novo", async () => {
    await renderPage({ ...chosen, q: "ana" });

    expect(GET).toHaveBeenCalledWith("/admin/customers", {
      params: { query: { q: "ana", page_size: 10 } },
      signal: expect.any(AbortSignal),
    });
    expect(screen.getByRole("link", { name: /Ana Souza/ })).toHaveAttribute(
      "href",
      "/admin/agenda/novo?barbeiro=1&servico=2&data=2026-11-02&hora=14:00&cliente=9",
    );
    expect(
      screen.getByRole("link", { name: "Cadastrar cliente novo" }),
    ).toHaveAttribute(
      "href",
      "/admin/agenda/novo?barbeiro=1&servico=2&data=2026-11-02&hora=14:00&cliente=novo",
    );
    const search = screen.getByRole("search");
    expect(within(search).getByLabelText("Buscar cliente")).toHaveValue("ana");
  });

  it("cliente: busca sem resultado", async () => {
    api({
      "/admin/customers": {
        data: { items: [], total: 0, page: 1, page_size: 10 },
      },
    });

    await renderPage({ ...chosen, q: "zzz" });

    expect(screen.getByText("Nenhum cliente encontrado.")).toBeInTheDocument();
  });

  it("confirmação com cliente novo mostra os campos do cadastro", async () => {
    await renderPage({ ...chosen, cliente: "novo" });

    expect(screen.getByText("Etapa 6 de 6 · Confirmação")).toBeInTheDocument();
    expect(screen.getByText("14:00 às 14:45")).toBeInTheDocument();
    expect(screen.getByLabelText("Nome")).toBeInTheDocument();
    expect(screen.getByLabelText("Telefone")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Confirmar agendamento" }),
    ).toBeInTheDocument();
    expect(document.querySelector('input[name="starts_at"]')).toHaveValue(
      "2026-11-02T14:00:00-03:00",
    );
    expect(document.querySelector('input[name="customer_id"]')).toBeNull();
  });

  it("confirmação com cliente cadastrado envia o id", async () => {
    await renderPage({ ...chosen, cliente: "9" });

    expect(screen.getByText("Ana Souza")).toBeInTheDocument();
    expect(screen.queryByLabelText("Nome")).not.toBeInTheDocument();
    expect(document.querySelector('input[name="customer_id"]')).toHaveValue(
      "9",
    );
  });

  it("horário que deixou de existir pede outro", async () => {
    await renderPage({ ...chosen, hora: "15:00", cliente: "novo" });

    expect(
      screen.getByText("Este horário não está mais disponível."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Confirmar agendamento" }),
    ).not.toBeInTheDocument();
  });
});
