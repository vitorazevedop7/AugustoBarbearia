import { render, screen } from "@testing-library/react";
import { notFound } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api/client";
import EditarBarbeiroPage from "./page";

vi.mock("@/lib/api/client", () => ({ createApiClient: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
vi.mock("../actions", () => ({
  createBarber: vi.fn(),
  updateBarber: vi.fn(),
}));

const GET = vi.fn();

function page(id: string) {
  return EditarBarbeiroPage({ params: Promise.resolve({ id }) });
}

describe("EditarBarbeiroPage", () => {
  beforeEach(() => {
    GET.mockReset();
    vi.mocked(createApiClient).mockReturnValue({ GET } as never);
    vi.mocked(notFound)
      .mockReset()
      .mockImplementation(() => {
        throw new Error("NOT_FOUND");
      });
  });

  it("abre o formulário com o barbeiro da API", async () => {
    GET.mockResolvedValue({
      data: {
        id: 3,
        name: "Manoel",
        photo_path: null,
        bio: null,
        active: true,
      },
      response: { status: 200 },
    });

    render(await page("3"));

    expect(GET).toHaveBeenCalledWith("/admin/barbers/{barber_id}", {
      params: { path: { barber_id: 3 } },
      signal: expect.any(AbortSignal),
    });
    expect(screen.getByLabelText("Nome")).toHaveValue("Manoel");
    expect(screen.getByLabelText("Situação")).toHaveValue("ativo");
  });

  it("mostra a página 404 para um id inexistente", async () => {
    GET.mockResolvedValue({
      response: { status: 404 },
      error: { code: "BARBER_NOT_FOUND", message: "Barbeiro não encontrado." },
    });

    await expect(page("99")).rejects.toThrow("NOT_FOUND");
  });

  it("mostra a página 404 para um id que não é número, sem chamar a API", async () => {
    await expect(page("abc")).rejects.toThrow("NOT_FOUND");
    expect(GET).not.toHaveBeenCalled();
  });

  it("avisa quando a API falha", async () => {
    GET.mockRejectedValue(new TypeError("fetch failed"));

    render(await page("3"));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível carregar o barbeiro. Tente novamente em instantes.",
    );
  });
});
