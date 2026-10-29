import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api/client";
import NovoServicoPage from "./page";

vi.mock("@/lib/api/client", () => ({ createApiClient: vi.fn() }));
vi.mock("../actions", () => ({
  createService: vi.fn(),
  updateService: vi.fn(),
}));

const GET = vi.fn();

describe("NovoServicoPage", () => {
  beforeEach(() => {
    GET.mockReset();
    vi.mocked(createApiClient).mockReturnValue({ GET } as never);
  });

  it("abre o formulário com todos os barbeiros para escolher", async () => {
    GET.mockResolvedValue({
      data: [
        { id: 1, name: "Edvaldo", photo_path: null, bio: null, active: true },
        { id: 4, name: "Caio", photo_path: null, bio: null, active: false },
      ],
      response: { status: 200 },
    });

    render(await NovoServicoPage());

    expect(GET).toHaveBeenCalledWith("/admin/barbers", {
      signal: expect.any(AbortSignal),
    });
    expect(screen.getByRole("checkbox", { name: "Edvaldo" })).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Caio (inativo)" }),
    ).not.toBeChecked();
    expect(screen.queryByLabelText("Situação")).toBeNull();
  });

  it("avisa quando os barbeiros não carregam", async () => {
    GET.mockRejectedValue(new TypeError("fetch failed"));

    render(await NovoServicoPage());

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível carregar os barbeiros. Tente novamente em instantes.",
    );
    expect(screen.queryByLabelText("Nome")).toBeNull();
  });
});
