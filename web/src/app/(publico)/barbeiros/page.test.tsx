import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPublicBarbers, getPublicShop } from "@/lib/api/public";
import { barbers, shop } from "@/test/vitrine-data";
import BarbersPage from "./page";

vi.mock("@/lib/api/public", () => ({
  getPublicBarbers: vi.fn(),
  getPublicShop: vi.fn(),
}));

describe("página de barbeiros — RN-60", () => {
  beforeEach(() => vi.mocked(getPublicShop).mockResolvedValue(shop));

  it("fecha a equipe com o mosaico e omite Instagram sem cadastro", async () => {
    vi.mocked(getPublicBarbers).mockResolvedValue(barbers);
    render(await BarbersPage());
    const mosaic = screen.getByRole("region", { name: "Nosso trabalho" });
    expect(within(mosaic).getAllByRole("img")).toHaveLength(5);
    expect(within(mosaic).queryByRole("link")).toBeNull();
    expect(mosaic.previousElementSibling).toContainElement(
      screen.getAllByRole("article")[0],
    );
  });
  it("mostra a foto decorativa no topo e preserva a faixa parcial lisa", async () => {
    vi.mocked(getPublicBarbers).mockResolvedValue(barbers);

    const { container } = render(await BarbersPage());
    const hero = screen.getByRole("heading", { level: 1 }).closest("section");
    const photo = hero?.querySelector("img");

    expect(photo).toHaveAttribute("alt", "");
    expect(photo).toHaveAttribute("fetchpriority", "high");
    expect(photo).not.toHaveAttribute("loading", "lazy");
    expect(photo).toHaveAttribute(
      "src",
      expect.stringContaining(
        encodeURIComponent("/images/vitrine/topo-equipe.jpg"),
      ),
    );
    expect(container.querySelector("[data-page-band] img")).toBeNull();
  });

  it("mostra cada barbeiro com retrato 4:5, a apresentação inteira e o link para agendar com ele", async () => {
    vi.mocked(getPublicBarbers).mockResolvedValue([
      {
        id: 7,
        name: "Bruno",
        photo_path: "/images/barbeiros/bruno.jpg",
        bio: "Apresentação cadastrada.\nCom uma segunda linha.",
      },
      ...barbers,
    ]);

    render(await BarbersPage());

    expect(
      screen.getByRole("heading", { level: 1, name: "Barbeiros" }),
    ).toBeVisible();
    const [bruno, edvaldo] = screen.getAllByRole("article");
    expect(
      within(bruno).getByRole("heading", { level: 2, name: "Bruno" }),
    ).toBeVisible();
    expect(within(bruno).getByRole("img")).toHaveAttribute(
      "alt",
      "Foto de Bruno",
    );
    expect(within(bruno).getByRole("img").parentElement).toHaveClass(
      "aspect-[4/5]",
    );
    expect(bruno).toHaveTextContent(
      "Apresentação cadastrada. Com uma segunda linha.",
    );
    expect(
      within(bruno).getByRole("link", { name: "Agendar com Bruno" }),
    ).toHaveAttribute("href", "/agendar?barbeiro=7");
    expect(within(edvaldo).queryByRole("img")).toBeNull();
    expect(within(edvaldo).getByText("E")).toBeInTheDocument();
  });

  it("põe as fotos sobre a faixa escura parcial", async () => {
    vi.mocked(getPublicBarbers).mockResolvedValue(barbers);

    const { container } = render(await BarbersPage());

    const band = container.querySelector("[data-page-band]");
    expect(band).toHaveAttribute("aria-hidden", "true");
    expect(band).toHaveClass("-z-10", "bg-ink", "lg:h-60");
    expect(band?.parentElement).toContainElement(
      screen.getAllByRole("article")[0],
    );
  });

  it("mantém o estado vazio legível sobre a faixa escura", async () => {
    vi.mocked(getPublicBarbers).mockResolvedValue([]);

    render(await BarbersPage());

    expect(
      screen.getByText("Nenhum barbeiro disponível no momento").parentElement,
    ).toHaveClass("bg-surface");
  });

  it("mostra o estado vazio", async () => {
    vi.mocked(getPublicBarbers).mockResolvedValue([]);

    render(await BarbersPage());

    expect(
      screen.getByText("Nenhum barbeiro disponível no momento"),
    ).toBeInTheDocument();
  });

  it("avisa quando a API não responde", async () => {
    vi.mocked(getPublicBarbers).mockResolvedValue(null);

    render(await BarbersPage());

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível carregar os barbeiros. Tente novamente em instantes.",
    );
  });
});
