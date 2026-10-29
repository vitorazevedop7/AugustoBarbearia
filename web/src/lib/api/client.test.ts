// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "./client";

function stubFetch() {
  const fetchMock = vi.fn<(request: Request) => Promise<Response>>(
    async () =>
      new Response(JSON.stringify({ status: "ok" }), {
        headers: { "Content-Type": "application/json" },
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("createApiClient", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("chama a API em API_INTERNAL_URL sem Authorization quando não há token", async () => {
    vi.stubEnv("API_INTERNAL_URL", "http://api.test:8000");
    const fetchMock = stubFetch();

    const { data } = await createApiClient().GET("/health");

    expect(data).toEqual({ status: "ok" });
    const request = fetchMock.mock.calls[0][0];
    expect(request.url).toBe("http://api.test:8000/health");
    expect(request.headers.has("Authorization")).toBe(false);
  });

  it("envia o token como Bearer", async () => {
    vi.stubEnv("API_INTERNAL_URL", "http://api.test:8000");
    const fetchMock = stubFetch();

    await createApiClient({ token: "jwt-de-teste" }).GET("/health");

    const request = fetchMock.mock.calls[0][0];
    expect(request.headers.get("Authorization")).toBe("Bearer jwt-de-teste");
  });

  it("falha com mensagem clara sem API_INTERNAL_URL", () => {
    vi.stubEnv("API_INTERNAL_URL", "");

    expect(() => createApiClient()).toThrow(
      "API_INTERNAL_URL não está configurada.",
    );
  });
});
