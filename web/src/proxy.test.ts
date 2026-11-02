import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { config, proxy } from "./proxy";

describe("proxy — caminho pedido para o login da administração", () => {
  it("grava o caminho e a busca no cabeçalho, por cima do que o navegador mandou", () => {
    const request = new NextRequest(
      "http://localhost:3000/admin/agenda/23?data=2026-11-02",
      { headers: { "x-requested-path": "//exemplo.com" } },
    );

    const response = proxy(request);

    expect(response.headers.get("x-middleware-request-x-requested-path")).toBe(
      "/admin/agenda/23?data=2026-11-02",
    );
  });

  it("só roda nas páginas da administração", () => {
    expect(config.matcher).toBe("/admin/:path*");
  });
});
