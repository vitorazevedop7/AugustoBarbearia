import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api/client";
import ClientesPage from "./page";

vi.mock("@/lib/api/client", () => ({ createApiClient: vi.fn() }));

const GET = vi.fn();

function page(params: Record<string, string> = {}) {
  return ClientesPage({ searchParams: Promise.resolve(params) });
}

function respond(items: unknown[], total = items.length) {
  GET.mockResolvedValue({
    data: { items, total, page: 1, page_size: 20 },
    response: { status: 200 },
  });
}

const ana = {
  id: 1,
  name: "Ana Souza",
  phone: "75999990000",
  email: "ana@example.com",
  has_account: true,
};
const beto = {
  id: 2,
  name: "Beto",
  phone: null,
  email: null,
  has_account: false,
};

describe("ClientesPage — RN-20, RN-62", () => {
  beforeEach(() => {
    GET.mockReset();
    vi.mocked(createApiClient).mockReturnValue({ GET } as never);
  });

  it("lista os clientes com telefone, e-mail, conta e link de edição", async () => {
    respond([ana, beto]);

    render(await page());

    const [first, second] = screen.getAllByRole("listitem");
    expect(within(first).getByText("Ana Souza")).toBeInTheDocument();
    expect(within(first).getByText("(75) 99999-0000")).toBeInTheDocument();
    expect(within(first).getByText("ana@example.com")).toBeInTheDocument();
    expect(within(first).getByText("Com conta Google")).toBeInTheDocument();
    expect(
      within(first).getByRole("link", { name: "Editar Ana Souza" }),
    ).toHaveAttribute("href", "/admin/clientes/1");
    expect(within(second).getByText("Sem telefone")).toBeInTheDocument();
    expect(within(second).getByText("Sem conta")).toBeInTheDocument();
    expect(screen.getByText("2 clientes")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Novo cliente" })).toHaveAttribute(
      "href",
      "/admin/clientes/novo",
    );
    expect(GET).toHaveBeenCalledWith("/admin/customers", {
      params: { query: { page: 1, page_size: 20 } },
      signal: expect.any(AbortSignal),
    });
  });

  it("busca por GET, com o texto de volta no campo", async () => {
    respond([ana]);

    render(await page({ q: "  ana  " }));

    expect(GET).toHaveBeenCalledWith(
      "/admin/customers",
      expect.objectContaining({
        params: { query: { q: "ana", page: 1, page_size: 20 } },
      }),
    );
    const search = screen.getByRole("search");
    expect(search).toHaveAttribute("method", "get");
    expect(search).toHaveAttribute("action", "/admin/clientes");
    expect(
      screen.getByLabelText("Buscar por nome, telefone ou e-mail"),
    ).toHaveValue("ana");
    expect(screen.getByRole("link", { name: "Limpar busca" })).toHaveAttribute(
      "href",
      "/admin/clientes",
    );
    expect(screen.getByText("1 cliente")).toBeInTheDocument();
  });

  it("pagina mantendo a busca", async () => {
    respond([ana], 45);

    render(await page({ q: "a", pagina: "2" }));

    expect(GET).toHaveBeenCalledWith(
      "/admin/customers",
      expect.objectContaining({
        params: { query: { q: "a", page: 2, page_size: 20 } },
      }),
    );
    expect(screen.getByText("Página 2 de 3")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Anterior" })).toHaveAttribute(
      "href",
      "/admin/clientes?q=a",
    );
    expect(screen.getByRole("link", { name: "Próxima" })).toHaveAttribute(
      "href",
      "/admin/clientes?q=a&pagina=3",
    );
  });

  it("não mostra páginas quando tudo cabe em uma", async () => {
    respond([ana]);

    render(await page());

    expect(screen.queryByText(/Página/)).toBeNull();
  });

  it("mostra o aviso de quem voltou de um formulário", async () => {
    respond([ana]);

    render(await page({ aviso: "cadastrado" }));

    expect(screen.getByRole("status")).toHaveTextContent("Cliente cadastrado.");
  });

  it("mostra o estado vazio do cadastro e o da busca sem resultado", async () => {
    respond([]);
    const { unmount } = render(await page());
    expect(screen.getByText("Nenhum cliente cadastrado")).toBeInTheDocument();
    unmount();

    respond([]);
    render(await page({ q: "zzz" }));
    expect(screen.getByText("Nenhum cliente encontrado")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Novo cliente" })).toHaveLength(
      1,
    );
  });

  it("oferece voltar à primeira página quando a página pedida ficou vazia", async () => {
    respond([], 20);

    render(await page({ q: "a", pagina: "2" }));

    expect(screen.getByText("Esta página ficou vazia")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Voltar à primeira página" }),
    ).toHaveAttribute("href", "/admin/clientes?q=a");
  });

  it("avisa quando a API falha, mantendo a busca", async () => {
    GET.mockRejectedValue(new TypeError("fetch failed"));

    render(await page());

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível carregar os clientes. Tente novamente em instantes.",
    );
    expect(screen.getByRole("search")).toBeInTheDocument();
  });
});
