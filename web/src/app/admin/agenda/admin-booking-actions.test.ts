import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api/client";
import { adminAppointment } from "@/test/agenda-data";
import {
  cancelAdminAppointment,
  createAdminAppointment,
  rescheduleAdminAppointment,
} from "./admin-booking-actions";
import type { AdminBookingState } from "./admin-booking-state";

vi.mock("@/lib/api/client", () => ({ createApiClient: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const POST = vi.fn();
const idle: AdminBookingState = { status: "idle" };
const unavailable = {
  code: "SLOT_UNAVAILABLE",
  message: "Este horário não está mais disponível. Escolha outro.",
};

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

const slot = {
  barber_id: "1",
  service_id: "2",
  starts_at: "2026-11-03T14:00:00-03:00",
};

describe("agendamento pela administração — Server Actions (RN-20 a RN-22)", () => {
  beforeEach(() => {
    POST.mockReset().mockResolvedValue({
      data: adminAppointment({ id: 12, source: "ADMIN" }),
      response: { status: 201 },
    });
    vi.mocked(createApiClient).mockReturnValue({ POST } as never);
    vi.mocked(redirect)
      .mockReset()
      .mockImplementation((destination) => {
        throw new Error(`REDIRECT:${destination}`);
      });
  });

  it("agenda um cliente cadastrado e vai para o detalhe com o aviso", async () => {
    await expect(
      createAdminAppointment(idle, form({ ...slot, customer_id: "3" })),
    ).rejects.toThrow("REDIRECT:/admin/agenda/12?data=2026-11-03&aviso=criado");
    expect(POST).toHaveBeenCalledWith("/admin/appointments", {
      body: {
        customer_id: 3,
        barber_id: 1,
        service_id: 2,
        starts_at: "2026-11-03T14:00:00-03:00",
      },
      signal: expect.any(AbortSignal),
    });
  });

  it("cadastra o cliente novo no mesmo pedido (RN-20)", async () => {
    await expect(
      createAdminAppointment(
        idle,
        form({
          ...slot,
          name: "João",
          phone: "(75) 99876-5432",
          email: "",
        }),
      ),
    ).rejects.toThrow("REDIRECT:");
    expect(POST.mock.calls[0][1].body).toEqual({
      customer: { name: "João", phone: "(75) 99876-5432", email: "" },
      barber_id: 1,
      service_id: 2,
      starts_at: "2026-11-03T14:00:00-03:00",
    });
  });

  it("recusa da API volta com o message, o code e o que foi digitado", async () => {
    POST.mockResolvedValue({ error: unavailable, response: { status: 409 } });

    const state = await createAdminAppointment(
      idle,
      form({ ...slot, name: "João", phone: "75998765432" }),
    );

    expect(state).toMatchObject({
      status: "error",
      message: unavailable.message,
      code: "SLOT_UNAVAILABLE",
      values: { name: "João", phone: "75998765432" },
    });
  });

  it("falha de rede mostra a mensagem genérica", async () => {
    POST.mockRejectedValue(new Error("offline"));

    const state = await cancelAdminAppointment(
      idle,
      form({ appointment_id: "7" }),
    );

    expect(state.message).toBe(
      "Não foi possível concluir agora. Tente novamente em instantes.",
    );
  });

  it("cancela e remarca pelas rotas da administração", async () => {
    await expect(
      cancelAdminAppointment(idle, form({ appointment_id: "7" })),
    ).rejects.toThrow("aviso=cancelado");
    expect(POST).toHaveBeenLastCalledWith(
      "/admin/appointments/{appointment_id}/cancel",
      {
        params: { path: { appointment_id: 7 } },
        signal: expect.any(AbortSignal),
      },
    );

    await expect(
      rescheduleAdminAppointment(
        idle,
        form({
          appointment_id: "7",
          starts_at: "2026-11-04T10:30:00-03:00",
          barber_id: "2",
        }),
      ),
    ).rejects.toThrow("aviso=remarcado");
    expect(POST).toHaveBeenLastCalledWith(
      "/admin/appointments/{appointment_id}/reschedule",
      {
        params: { path: { appointment_id: 7 } },
        body: { starts_at: "2026-11-04T10:30:00-03:00", barber_id: 2 },
        signal: expect.any(AbortSignal),
      },
    );
  });

  it("id inválido nem chama a API", async () => {
    const state = await cancelAdminAppointment(
      idle,
      form({ appointment_id: "abc" }),
    );

    expect(state.status).toBe("error");
    expect(POST).not.toHaveBeenCalled();
  });
});
