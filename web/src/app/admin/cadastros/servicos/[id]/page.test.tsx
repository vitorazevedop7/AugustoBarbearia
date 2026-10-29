import { render, screen } from "@testing-library/react";
import { notFound } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api/client";
import EditarServicoPage from "./page";

vi.mock("@/lib/api/client", () => ({ createApiClient: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
vi.mock("../actions", () => ({
  createService: vi.fn(),
  updateService: vi.fn(),
}));

const GET = vi.fn();

const service = {
  id: 1,
  name: "Corte Simples",
  description: null,
  price: "25.00",
  duration_minutes: 30,
  active: true,
  barbers: [{ id: 3, name: "Manoel", active: true }],
};
const barbers = [
  { id: 1, name: "Edvaldo", photo_path: null, bio: null, active: true },
  { id: 3, name: "Manoel", photo_path: null, bio: null, active: true },
];

function respond(paths: Record<string, unknown>) {
  GET.mockImplementation((path: string) => Promise.resolve(paths[path]));
}

function page(id: string) {
  return EditarServicoPage({ params: Promise.resolve({ id }) });
}

describe("EditarServicoPage", () => {
  beforeEach(() => {
    GET.mockReset();
    vi.mocked(createApiClient).mockReturnValue({ GET } as never);
    vi.mocked(notFound)
      .mockReset()
      .mockImplementation(() => {
        throw new Error("NOT_FOUND");
      });
  });

  it("abre o formulário com o serviço e os barbeiros da API", async () => {
    respond({
      "/admin/services/{service_id}": {
        data: service,
        response: { status: 200 },
      },
      "/admin/barbers": { data: barbers, response: { status: 200 } },
    });

    render(await page("1"));

    expect(GET).toHaveBeenCalledWith("/admin/services/{service_id}", {
      params: { path: { service_id: 1 } },
      signal: expect.any(AbortSignal),
    });
    expect(screen.getByLabelText("Nome")).toHaveValue("Corte Simples");
    expect(screen.getByLabelText("Preço")).toHaveValue("25,00");
    expect(screen.getByRole("checkbox", { name: "Manoel" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Edvaldo" })).not.toBeChecked();
    expect(screen.getByLabelText("Situação")).toHaveValue("ativo");
  });

  it("mostra a página 404 para um id inexistente", async () => {
    respond({
      "/admin/services/{service_id}": {
        response: { status: 404 },
        error: {
          code: "SERVICE_NOT_FOUND",
          message: "Serviço não encontrado.",
        },
      },
      "/admin/barbers": { data: barbers, response: { status: 200 } },
    });

    await expect(page("99")).rejects.toThrow("NOT_FOUND");
  });

  it("mostra a página 404 para um id que não é número, sem chamar a API", async () => {
    await expect(page("abc")).rejects.toThrow("NOT_FOUND");
    expect(GET).not.toHaveBeenCalled();
  });

  it("avisa quando a API falha", async () => {
    GET.mockRejectedValue(new TypeError("fetch failed"));

    render(await page("1"));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível carregar o serviço. Tente novamente em instantes.",
    );
  });

  it("mostra o erro da API quando os barbeiros não carregam", async () => {
    respond({
      "/admin/services/{service_id}": {
        data: service,
        response: { status: 200 },
      },
      "/admin/barbers": {
        response: { status: 403 },
        error: {
          code: "HTTP_403",
          message: "Você não tem permissão para realizar esta ação.",
        },
      },
    });

    render(await page("1"));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Você não tem permissão para realizar esta ação.",
    );
    expect(screen.queryByLabelText("Nome")).toBeNull();
  });
});
