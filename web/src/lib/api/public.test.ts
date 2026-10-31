// @vitest-environment node
import { unstable_cache } from "next/cache";
import { connection } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPublicApiClient } from "./client";
import { getPublicBarbers, getPublicServices, getPublicShop } from "./public";

vi.mock("server-only", () => ({}));
vi.mock("./client", () => ({ createPublicApiClient: vi.fn() }));
vi.mock("next/server", () => ({ connection: vi.fn() }));
// Sem o servidor do Next, o cache de dados vira uma chamada direta; as opções
// usadas ficam registradas no mock.
vi.mock("next/cache", () => ({
  unstable_cache: vi.fn((load: () => Promise<unknown>) => load),
}));
// O `cache` do React só deduplica dentro de uma requisição de servidor.
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  cache: <T>(load: T) => load,
}));

const GET = vi.fn();

describe("leituras da vitrine", () => {
  // O módulo registra os caches na importação, antes dos testes.
  const cacheOptions = vi
    .mocked(unstable_cache)
    .mock.calls.map(([, keyParts, options]) => ({ keyParts, options }));

  beforeEach(() => {
    GET.mockReset();
    vi.mocked(connection).mockReset();
    vi.mocked(createPublicApiClient).mockReturnValue({ GET } as never);
  });

  it("guarda cada leitura no cache com a tag que a administração invalida", () => {
    expect(cacheOptions).toEqual(
      ["public-shop", "public-services", "public-barbers"].map((tag) => ({
        keyParts: [tag],
        options: { tags: [tag], revalidate: 300 },
      })),
    );
  });

  it("renderiza na requisição e devolve o que a API respondeu", async () => {
    GET.mockResolvedValue({ data: [{ id: 1, name: "Corte" }] });

    await expect(getPublicServices()).resolves.toEqual([
      { id: 1, name: "Corte" },
    ]);
    expect(connection).toHaveBeenCalled();
    expect(GET).toHaveBeenCalledWith("/public/services", {
      signal: expect.any(AbortSignal),
    });
  });

  it("devolve null quando a API responde com erro", async () => {
    GET.mockResolvedValue({ error: { code: "X", message: "x" } });

    await expect(getPublicShop()).resolves.toBeNull();
  });

  it("devolve null quando a API não responde", async () => {
    GET.mockRejectedValue(new TypeError("fetch failed"));

    await expect(getPublicBarbers()).resolves.toBeNull();
  });
});
