import { describe, expect, it, vi } from "vitest";
import {
  downloadUnavailableMessage,
  fileResponse,
  unavailableResponse,
} from "./download";

vi.mock("server-only", () => ({}));

describe("arquivo da API pelo Route Handler", () => {
  it("repassa os bytes, o tipo e o nome do arquivo da API", async () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, 0x41]).buffer;
    const response = fileResponse({
      data: bytes,
      response: new Response(null, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="relatorio.csv"',
        },
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "text/csv; charset=utf-8",
    );
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="relatorio.csv"',
    );
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    // O BOM chega intacto.
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      new Uint8Array(bytes),
    );
  });

  it("recusa da API: o message dela, em texto, com o mesmo status", async () => {
    const response = fileResponse({
      error: {
        code: "APPOINTMENT_NOT_FOUND",
        message: "Agendamento não encontrado.",
      },
      response: new Response(null, { status: 404 }),
    });

    expect(response.status).toBe(404);
    expect(response.headers.get("Content-Type")).toBe(
      "text/plain; charset=utf-8",
    );
    expect(await response.text()).toBe("Agendamento não encontrado.");
  });

  it("erro sem o formato da API usa a mensagem padrão", async () => {
    const response = fileResponse({
      error: "<html>Bad gateway</html>",
      response: new Response(null, { status: 502 }),
    });

    expect(response.status).toBe(502);
    expect(await response.text()).toBe(downloadUnavailableMessage);
  });

  it("falha de rede vira 502 com a mensagem padrão", async () => {
    const response = unavailableResponse();

    expect(response.status).toBe(502);
    expect(await response.text()).toBe(downloadUnavailableMessage);
  });
});
