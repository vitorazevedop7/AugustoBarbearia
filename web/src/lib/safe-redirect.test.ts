import { describe, expect, it, vi } from "vitest";
import { safeRedirectPath } from "./session";

vi.mock("@/lib/auth", () => ({ auth: {} }));

describe("safeRedirectPath", () => {
  it("aceita caminhos internos", () => {
    expect(safeRedirectPath("/agendar?servico=corte")).toBe(
      "/agendar?servico=corte",
    );
  });

  it.each([
    "//exemplo.com",
    "/\\exemplo.com",
    "https://exemplo.com",
    "agendar",
    "",
    undefined,
    ["/a", "/b"],
  ])("manda %j para a página inicial", (value) => {
    expect(safeRedirectPath(value)).toBe("/");
  });
});
