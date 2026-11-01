import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api/client";
import { getPublicBarbers, getPublicServices } from "@/lib/api/public";
import { adminAppointment } from "@/test/agenda-data";
import { barbers, services } from "@/test/vitrine-data";
import RescheduleAdminAppointmentPage from "./page";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/api/client", () => ({ createApiClient: vi.fn() }));
vi.mock("@/lib/api/public", () => ({
  getPublicBarbers: vi.fn(),
  getPublicServices: vi.fn(),
}));
vi.mock("../../admin-booking-actions", () => ({
  rescheduleAdminAppointment: vi.fn(),
}));

const GET = vi.fn();
const slots = [
  {
    starts_at: "2026-11-03T10:30:00-03:00",
    ends_at: "2026-11-03T11:15:00-03:00",
  },
];

function api(overrides: Record<string, unknown> = {}) {
  const routes: Record<string, unknown> = {
    "/admin/appointments/{appointment_id}": { data: adminAppointment() },
    "/admin/appointments/{appointment_id}/availability/days": {
      data: { barber_id: 1, service_id: 2, days: ["2026-11-03"] },
    },
    "/admin/appointments/{appointment_id}/availability": {
      data: { barber_id: 1, service_id: 2, date: "2026-11-03", slots },
    },
    ...overrides,
  };
  GET.mockImplementation(async (path: string) => routes[path]);
}

async function renderPage(params: Record<string, string> = {}) {
  render(
    await RescheduleAdminAppointmentPage({
      params: Promise.resolve({ id: "7" }),
      searchParams: Promise.resolve(params),
    }),
  );
}

describe("remarcar pela administração — /admin/agenda/[id]/remarcar (RN-15, RN-22)", () => {
  beforeEach(() => {
    GET.mockReset();
    api();
    vi.mocked(createApiClient).mockReturnValue({ GET } as never);
    vi.mocked(getPublicBarbers).mockResolvedValue(barbers);
    vi.mocked(getPublicServices).mockResolvedValue(services);
  });

  it("entra pelo dia, com o barbeiro atual e os dias da administração", async () => {
    await renderPage({ barbeiro: "1" });

    expect(screen.getByText("Etapa 2 de 4 · Dia")).toBeInTheDocument();
    expect(GET).toHaveBeenCalledWith(
      "/admin/appointments/{appointment_id}/availability/days",
      {
        params: { path: { appointment_id: 7 }, query: { barber_id: 1 } },
        signal: expect.any(AbortSignal),
      },
    );
    expect(
      screen.getByRole("link", { name: "terça-feira, 3 de novembro de 2026" }),
    ).toHaveAttribute(
      "href",
      "/admin/agenda/7/remarcar?barbeiro=1&data=2026-11-03",
    );
  });

  it("a confirmação só fala de e-mail se o cliente tiver (RN-50, RN-52)", async () => {
    await renderPage({ barbeiro: "1", data: "2026-11-03", hora: "10:30" });
    expect(
      screen.getByText(/O cliente será avisado por e-mail\./),
    ).toBeInTheDocument();
  });

  it("cliente sem e-mail: a confirmação manda falar pelo telefone", async () => {
    const base = adminAppointment();
    api({
      "/admin/appointments/{appointment_id}": {
        data: { ...base, customer: { ...base.customer, email: null } },
      },
    });

    await renderPage({ barbeiro: "1", data: "2026-11-03", hora: "10:30" });

    expect(
      screen.getByText(/não tem e-mail cadastrado e não receberá aviso/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/será avisado por e-mail/),
    ).not.toBeInTheDocument();
  });

  it("confirma com o horário novo", async () => {
    await renderPage({ barbeiro: "1", data: "2026-11-03", hora: "10:30" });

    expect(screen.getByText("10:30 às 11:15")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Confirmar remarcação" }),
    ).toBeInTheDocument();
    expect(document.querySelector('input[name="starts_at"]')).toHaveValue(
      "2026-11-03T10:30:00-03:00",
    );
  });

  it("agendamento que não está ativo não remarca", async () => {
    api({
      "/admin/appointments/{appointment_id}": {
        data: adminAppointment({ status: "NO_SHOW" }),
      },
    });

    await renderPage({ barbeiro: "1" });

    expect(
      screen.getByText("Este agendamento não está mais ativo."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Etapa/)).not.toBeInTheDocument();
  });
});
