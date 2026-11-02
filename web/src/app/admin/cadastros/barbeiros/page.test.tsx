import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api/client";
import BarbeirosPage from "./page";

vi.mock("@/lib/api/client", () => ({ createApiClient: vi.fn() }));

const GET = vi.fn();

function page(aviso?: string) {
  return BarbeirosPage({ searchParams: Promise.resolve({ aviso }) });
}

describe("BarbeirosPage — RN-60", () => {
  beforeEach(() => {
    GET.mockReset();
    vi.mocked(createApiClient).mockReturnValue({ GET } as never);
  });

  it("lista os barbeiros com foto, situação e link de edição", async () => {
    GET.mockResolvedValue({
      data: [
        {
          id: 1,
          name: "Edvaldo",
          photo_path: "/images/barbeiros/edvaldo.jpg",
          bio: null,
          active: true,
        },
        { id: 4, name: "caio", photo_path: null, bio: null, active: false },
      ],
      response: { status: 200 },
    });

    render(await page());

    const [edvaldo, caio] = screen.getAllByRole("listitem");
    expect(within(edvaldo).getByRole("img")).toHaveAttribute(
      "alt",
      "Foto de Edvaldo",
    );
    expect(within(edvaldo).getByText("Ativo")).toBeInTheDocument();
    expect(
      within(edvaldo).getByRole("link", { name: "Editar Edvaldo" }),
    ).toHaveAttribute("href", "/admin/cadastros/barbeiros/1");
    expect(within(caio).queryByRole("img")).toBeNull();
    expect(within(caio).getByText("C")).toBeInTheDocument();
    expect(within(caio).getByText("Inativo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Novo barbeiro" })).toHaveAttribute(
      "href",
      "/admin/cadastros/barbeiros/novo",
    );
    expect(screen.queryByRole("status")).toBeNull();
    // Coluna `minmax(0, 1fr)` no celular: um nome longo não alarga a grade
    // além da tela (#150).
    expect(screen.getByRole("list")).toHaveClass("grid-cols-1");
  });

  it("mostra o aviso de quem voltou de um formulário", async () => {
    GET.mockResolvedValue({ data: [], response: { status: 200 } });

    render(await page("atualizado"));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Barbeiro atualizado.",
    );
  });

  it("mostra o estado vazio com o botão de cadastro", async () => {
    GET.mockResolvedValue({ data: [], response: { status: 200 } });

    render(await page("qualquer coisa"));

    expect(screen.getByText("Nenhum barbeiro cadastrado")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Novo barbeiro" })).toBeVisible();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("avisa quando a API falha", async () => {
    GET.mockRejectedValue(new TypeError("fetch failed"));

    render(await page());

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível carregar os barbeiros. Tente novamente em instantes.",
    );
  });
});
