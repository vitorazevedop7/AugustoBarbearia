import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api/client";
import { GET as exportCsv } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/api/client", () => ({ createApiClient: vi.fn() }));

const GET = vi.fn();
const BYTES = new TextEncoder().encode("﻿Data;Hora\r\n").buffer;

function csvResult() {
  return {
    data: BYTES,
    response: new Response(null, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="relatorio-2026-11-01-a-2026-11-30.csv"',
      },
    }),
  };
}

function request(search = "") {
  return new Request(`http://localhost:3000/admin/relatorio/exportar${search}`);
}

describe("exportar CSV — /admin/relatorio/exportar — RN-43", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    // Terça, 3/11/2026, 9h em São Paulo.
    vi.setSystemTime(new Date("2026-11-03T12:00:00Z"));
    GET.mockReset().mockResolvedValue(csvResult());
    vi.mocked(createApiClient).mockReturnValue({ GET } as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("pede à API o período e o barbeiro da URL e devolve o arquivo", async () => {
    const response = await exportCsv(
      request("?inicio=2026-10-01&fim=2026-10-31&barbeiro=2"),
    );

    expect(GET).toHaveBeenCalledWith("/admin/reports/financial.csv", {
      params: {
        query: { start: "2026-10-01", end: "2026-10-31", barber_id: 2 },
      },
      parseAs: "arrayBuffer",
      signal: expect.any(AbortSignal),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "text/csv; charset=utf-8",
    );
    expect(response.headers.get("Content-Disposition")).toContain(
      "relatorio-2026-11-01-a-2026-11-30.csv",
    );
    // `text()` descartaria o BOM; os bytes têm de chegar como a API os mandou.
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      new Uint8Array(BYTES),
    );
  });

  it("sem parâmetros, vale Este mês, como a tela", async () => {
    await exportCsv(request());

    expect(GET.mock.calls[0][1].params.query).toEqual({
      start: "2026-11-01",
      end: "2026-11-30",
      barber_id: undefined,
    });
  });

  it("a recusa da API (período inválido) chega como texto, com o status", async () => {
    GET.mockResolvedValue({
      error: {
        code: "INVALID_PERIOD",
        message: "Escolha um período de até 366 dias.",
      },
      response: new Response(null, { status: 422 }),
    });

    const response = await exportCsv(
      request("?inicio=2024-01-01&fim=2026-01-01"),
    );

    expect(response.status).toBe(422);
    expect(await response.text()).toBe("Escolha um período de até 366 dias.");
  });

  it("API fora do ar: 502 com a mensagem", async () => {
    GET.mockRejectedValue(new Error("rede"));

    const response = await exportCsv(request());

    expect(response.status).toBe(502);
    expect(await response.text()).toContain("Não foi possível gerar o arquivo");
  });
});
