import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DayPicker } from "./day-picker";
import { TimePicker } from "./time-picker";

describe("DayPicker", () => {
  it("agrupa os dias por mês e leva cada um ao destino dado", () => {
    render(
      <DayPicker
        days={["2026-11-30", "2026-12-01", "2026-12-02"]}
        hrefFor={(date) => `/remarcar?data=${date}`}
        headingLevel="h3"
      />,
    );

    const november = screen.getByRole("region", { name: "Novembro de 2026" });
    expect(within(november).getAllByRole("link")).toHaveLength(1);
    const december = screen.getByRole("region", { name: "Dezembro de 2026" });
    const [first] = within(december).getAllByRole("link");
    expect(first).toHaveAccessibleName("terça-feira, 1 de dezembro de 2026");
    expect(first).toHaveAttribute("href", "/remarcar?data=2026-12-01");
    expect(first).toHaveTextContent("Ter1dez");
    // Área de toque bem acima dos 44px.
    expect(first).toHaveClass("min-h-20");
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(2);
  });
});

describe("TimePicker", () => {
  it("separa manhã e tarde no fuso de São Paulo e esconde o grupo vazio", () => {
    render(
      <TimePicker
        slots={[
          {
            // 14h em UTC = 11h em São Paulo: ainda é manhã.
            starts_at: "2026-11-03T14:00:00Z",
            ends_at: "2026-11-03T14:30:00Z",
          },
          {
            starts_at: "2026-11-03T11:30:00-03:00",
            ends_at: "2026-11-03T12:00:00-03:00",
          },
        ]}
        hrefFor={(slot) => `/remarcar?inicio=${slot.starts_at}`}
      />,
    );

    const morning = screen.getByRole("region", { name: "Manhã" });
    expect(
      within(morning)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["11:00", "11:30"]);
    expect(screen.queryByRole("region", { name: "Tarde" })).toBeNull();
    // Área de toque de 44px e o número na fonte dos títulos, em negrito, como o dia.
    expect(screen.getByRole("link", { name: "11:30" })).toHaveClass(
      "min-h-11",
      "font-heading",
      "font-semibold",
    );
    expect(screen.getByRole("link", { name: "11:00" })).toHaveAttribute(
      "href",
      "/remarcar?inicio=2026-11-03T14:00:00Z",
    );
  });
});
