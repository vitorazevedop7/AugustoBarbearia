import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api/client";
import { ApiStatus } from "./api-status";

vi.mock("@/lib/api/client", () => ({ createApiClient: vi.fn() }));

const GET = vi.fn();

describe("ApiStatus", () => {
  beforeEach(() => {
    GET.mockReset();
    vi.mocked(createApiClient).mockReturnValue({ GET } as never);
  });

  it("mostra o status quando a API responde", async () => {
    GET.mockResolvedValue({ data: { status: "ok" }, error: undefined });

    render(await ApiStatus());

    expect(screen.getByRole("status")).toHaveTextContent("API: ok");
    expect(GET).toHaveBeenCalledWith("/health", {
      signal: expect.any(AbortSignal),
    });
  });

  it("mostra a mensagem de erro da API", async () => {
    GET.mockResolvedValue({
      data: undefined,
      error: {
        code: "DATABASE_UNAVAILABLE",
        message: "O banco de dados está indisponível.",
      },
    });

    render(await ApiStatus());

    expect(screen.getByRole("status")).toHaveTextContent(
      "API: O banco de dados está indisponível.",
    );
  });

  it("mostra o status HTTP quando o erro não segue o contrato", async () => {
    GET.mockResolvedValue({
      data: undefined,
      error: "Bad Gateway",
      response: new Response("Bad Gateway", { status: 502 }),
    });

    render(await ApiStatus());

    expect(screen.getByRole("status")).toHaveTextContent("API: HTTP 502");
  });

  it("avisa quando a API está inacessível", async () => {
    GET.mockRejectedValue(new TypeError("fetch failed"));

    render(await ApiStatus());

    expect(screen.getByRole("status")).toHaveTextContent("API: inacessível");
  });
});
