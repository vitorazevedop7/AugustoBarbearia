import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api/client";
import { getCurrentSession } from "@/lib/session";
import { GET as calendar } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/api/client", () => ({ createApiClient: vi.fn() }));
vi.mock("@/lib/session", () => ({ getCurrentSession: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const GET = vi.fn();
const ICS = "BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n";

function call(id = "7") {
  return calendar(new Request("http://localhost:3000/x"), {
    params: Promise.resolve({ id }),
  });
}

describe("adicionar ao calendário — /meus-agendamentos/[id]/calendario (RN-16)", () => {
  beforeEach(() => {
    GET.mockReset().mockResolvedValue({
      data: new TextEncoder().encode(ICS).buffer,
      response: new Response(null, {
        headers: {
          "Content-Type": "text/calendar; charset=utf-8",
          "Content-Disposition": 'attachment; filename="agendamento-7.ics"',
        },
      }),
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
  });

  it("devolve o .ics da API com o nome do arquivo", async () => {
    const response = await call();

    expect(GET).toHaveBeenCalledWith(
      "/me/appointments/{appointment_id}/calendar.ics",
      {
        params: { path: { appointment_id: 7 } },
        parseAs: "arrayBuffer",
        signal: expect.any(AbortSignal),
      },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "text/calendar; charset=utf-8",
    );
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="agendamento-7.ics"',
    );
    expect(await response.text()).toBe(ICS);
  });

  it("sem sessão, leva ao login e volta para o download", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(null);

    await expect(call()).rejects.toThrow(
      "REDIRECT:/entrar?voltar=%2Fmeus-agendamentos%2F7%2Fcalendario",
    );
    expect(GET).not.toHaveBeenCalled();
  });

  it("id inválido responde 404 sem chamar a API", async () => {
    const response = await call("abc");

    expect(response.status).toBe(404);
    expect(GET).not.toHaveBeenCalled();
  });

  it("agendamento de outro cliente: 404 com o message da API (RN-16)", async () => {
    GET.mockResolvedValue({
      error: {
        code: "APPOINTMENT_NOT_FOUND",
        message: "Agendamento não encontrado.",
      },
      response: new Response(null, { status: 404 }),
    });

    const response = await call();

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Agendamento não encontrado.");
  });

  it("agendamento cancelado: 409 com o message da API (RN-31)", async () => {
    GET.mockResolvedValue({
      error: {
        code: "APPOINTMENT_NOT_ACTIVE",
        message: "Este agendamento não está mais ativo.",
      },
      response: new Response(null, { status: 409 }),
    });

    const response = await call();

    expect(response.status).toBe(409);
    expect(await response.text()).toBe("Este agendamento não está mais ativo.");
  });

  it("API fora do ar: 502", async () => {
    GET.mockRejectedValue(new Error("rede"));

    expect((await call()).status).toBe(502);
  });
});
