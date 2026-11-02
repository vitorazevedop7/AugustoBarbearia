import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageHero } from "./page-hero";

describe("PageHero", () => {
  it("mantém o título e a faixa parcial lisa quando não recebe foto", () => {
    const { container } = render(
      <PageHero title="Serviços" description="Escolha o serviço.">
        <p>Conteúdo da página</p>
      </PageHero>,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Serviços" }),
    ).toBeVisible();
    expect(screen.getByText("Escolha o serviço.")).toBeVisible();
    expect(screen.getByText("Conteúdo da página")).toBeVisible();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("[data-page-band]")).toHaveClass(
      "bg-ink",
      "h-32",
      "md:h-48",
      "lg:h-60",
    );
  });

  it("limita a foto e o overlay ao título, com carga lazy e sem alterar o conteúdo", () => {
    const { container } = render(
      <PageHero
        title="Barbeiros"
        description="Conheça a equipe."
        photo={{ src: "/images/vitrine/hero.jpg" }}
      >
        <p>Equipe completa</p>
      </PageHero>,
    );

    const hero = screen.getByRole("heading", { level: 1 }).closest("section");
    const photo = hero?.querySelector("img");
    expect(photo).toHaveAttribute("alt", "");
    expect(photo).toHaveAttribute("loading", "lazy");
    expect(photo).toHaveAttribute("sizes", "100vw");
    expect(photo).toHaveAttribute("data-nimg", "fill");
    expect(photo).toHaveClass("object-cover");
    expect(photo?.parentElement).toHaveAttribute("aria-hidden", "true");
    expect(photo?.parentElement?.lastElementChild).toHaveClass("bg-ink/80");
    expect(container.querySelector("[data-page-band] img")).toBeNull();
    expect(screen.getByText("Equipe completa")).toBeVisible();
  });
});
