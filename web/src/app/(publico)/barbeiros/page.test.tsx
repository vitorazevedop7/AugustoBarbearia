import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getPublicBarbers } from "@/lib/api/public";
import { barbers } from "@/test/vitrine-data";
import BarbersPage from "./page";

vi.mock("@/lib/api/public", () => ({ getPublicBarbers: vi.fn() }));

describe("página de barbeiros — RN-60", () => {
  it("mostra cada barbeiro com foto 6:7, a apresentação inteira e o link para agendar com ele", async () => {
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
      "aspect-[6/7]",
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

  it("põe as fotos sobre a faixa escura parcial, mais alta que o maior degrau", async () => {
    vi.mocked(getPublicBarbers).mockResolvedValue(barbers);

    const { container } = render(await BarbersPage());

    const band = container.querySelector("[data-page-band]");
    expect(band).toHaveAttribute("aria-hidden", "true");
    // 240px no desktop: o terceiro card, 145px abaixo, também a atravessa.
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
