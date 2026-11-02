import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NotFound from "./not-found";
import AdminNotFound from "./admin/not-found";

describe("página não encontrada (#151)", () => {
  it("em português, com o alvo de Pular para o conteúdo e o caminho de volta", () => {
    render(<NotFound />);

    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(
      screen.getByRole("heading", { level: 1, name: "Página não encontrada" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Voltar para o início" }),
    ).toHaveAttribute("href", "/");
    expect(
      screen.getByRole("link", { name: "Agendar horário" }),
    ).toHaveAttribute("href", "/agendar");
  });

  it("na administração, volta ao início dela", () => {
    render(<AdminNotFound />);

    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(
      screen.getByRole("link", {
        name: "Voltar para o início da administração",
      }),
    ).toHaveAttribute("href", "/admin");
  });
});
