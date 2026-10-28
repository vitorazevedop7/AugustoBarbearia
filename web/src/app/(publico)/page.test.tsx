import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import HomePage from "./page";

describe("página inicial", () => {
  it("identifica a barbearia e mostra o estado em construção", () => {
    render(
      <>
        <SiteHeader />
        <HomePage />
        <SiteFooter />
      </>,
    );

    expect(
      within(screen.getByRole("banner")).getByRole("link", {
        name: "Augusto Barbearia — página inicial",
      }),
    ).toHaveAttribute("href", "/");
    expect(
      within(screen.getByRole("main")).getByRole("heading", {
        name: "Em construção",
        level: 1,
      }),
    ).toBeVisible();
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.getByRole("contentinfo")).toHaveTextContent(
      "Augusto Barbearia",
    );
  });
});
