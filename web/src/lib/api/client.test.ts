// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient, createPublicApiClient } from "./client";
import { getApiToken } from "./token";

vi.mock("server-only", () => ({}));
vi.mock("./token", () => ({ getApiToken: vi.fn() }));

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
  beforeEach(() => {
    vi.mocked(getApiToken).mockReset().mockResolvedValue(null);
  });

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

  it("RN-71: envia o JWT da sessão atual como Bearer, sem cache", async () => {
    vi.stubEnv("API_INTERNAL_URL", "http://api.test:8000");
    const fetchMock = stubFetch();

    vi.mocked(getApiToken).mockResolvedValue("jwt-de-teste");

    await createApiClient().GET("/health");

    const request = fetchMock.mock.calls[0][0];
    expect(request.headers.get("Authorization")).toBe("Bearer jwt-de-teste");
    expect(request.cache).toBe("no-store");
  });

  it("RN-71: não reutiliza o token de outra sessão entre requisições", async () => {
    vi.stubEnv("API_INTERNAL_URL", "http://api.test:8000");
    const fetchMock = stubFetch();
    vi.mocked(getApiToken)
      .mockResolvedValueOnce("jwt-admin")
      .mockResolvedValueOnce("jwt-cliente")
      .mockResolvedValueOnce(null);
    const client = createApiClient();

    await client.GET("/health");
    await client.GET("/health");
    await client.GET("/health");

    expect(
      fetchMock.mock.calls.map(([request]) =>
        request.headers.get("Authorization"),
      ),
    ).toEqual(["Bearer jwt-admin", "Bearer jwt-cliente", null]);
  });

  it("RN-71: não chama a API quando não consegue obter o token", async () => {
    vi.stubEnv("API_INTERNAL_URL", "http://api.test:8000");
    const fetchMock = stubFetch();
    vi.mocked(getApiToken).mockRejectedValue(new Error("Sessão indisponível"));

    await expect(createApiClient().GET("/health")).rejects.toThrow(
      "Sessão indisponível",
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falha com mensagem clara sem API_INTERNAL_URL", () => {
    vi.stubEnv("API_INTERNAL_URL", "");

    expect(() => createApiClient()).toThrow(
      "API_INTERNAL_URL não está configurada.",
    );
  });
});

describe("createPublicApiClient", () => {
  beforeEach(() => {
    vi.mocked(getApiToken).mockReset().mockResolvedValue("jwt-de-teste");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("RN-70: lê as rotas públicas sem token e sem consultar a sessão", async () => {
    vi.stubEnv("API_INTERNAL_URL", "http://api.test:8000");
    const fetchMock = stubFetch();

    await createPublicApiClient().GET("/public/shop");

    const request = fetchMock.mock.calls[0][0];
    expect(request.url).toBe("http://api.test:8000/public/shop");
    expect(request.headers.has("Authorization")).toBe(false);
    expect(request.cache).toBe("no-store");
    expect(getApiToken).not.toHaveBeenCalled();
  });

  it("falha com mensagem clara sem API_INTERNAL_URL", () => {
    vi.stubEnv("API_INTERNAL_URL", "");

    expect(() => createPublicApiClient()).toThrow(
      "API_INTERNAL_URL não está configurada.",
    );
  });
});
