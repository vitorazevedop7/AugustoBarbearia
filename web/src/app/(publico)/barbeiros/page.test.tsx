import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getPublicBarbers } from "@/lib/api/public";
import { barbers } from "@/test/vitrine-data";
import BarbersPage from "./page";

vi.mock("@/lib/api/public", () => ({ getPublicBarbers: vi.fn() }));

describe("página de barbeiros — RN-60", () => {
  it("mostra cada barbeiro com foto 4:5, apresentação e o link para agendar com ele", async () => {
    vi.mocked(getPublicBarbers).mockResolvedValue([
      {
        id: 7,
        name: "Bruno",
        photo_path: "/images/barbeiros/bruno.jpg",
        bio: "Apresentação cadastrada.",
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
    expect(bruno).toHaveTextContent("Apresentação cadastrada.");
    expect(
      within(bruno).getByRole("link", { name: "Agendar com Bruno" }),
    ).toHaveAttribute("href", "/agendar?barbeiro=7");
    expect(within(edvaldo).queryByRole("img")).toBeNull();
    expect(within(edvaldo).getByText("E")).toBeInTheDocument();
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
