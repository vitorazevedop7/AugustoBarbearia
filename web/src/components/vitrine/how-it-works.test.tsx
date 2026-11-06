import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HowItWorks } from "./how-it-works";

describe("HowItWorks", () => {
  it("apresenta o agendamento na ordem da D11", () => {
    render(<HowItWorks />);

    const section = screen.getByRole("region", { name: "Como funciona" });
    const steps = within(section).getAllByRole("listitem");
    expect(steps.map((step) => step.textContent)).toEqual([
      "Escolha o barbeiro.",
      "Escolha o serviço.",
      "Escolha o dia e o horário.",
      "Confirme com sua conta Google.",
    ]);
  });

  it("descreve o prazo da RN-14 e a condição do lembrete da RN-51", () => {
    render(<HowItWorks />);

    expect(
      screen.getByText(/lembrete por e-mail cerca de um dia antes/),
    ).toHaveTextContent(
      "para reservas feitas com pelo menos 24 horas de antecedência",
    );
    expect(
      screen.getByText(
        "Remarque ou cancele pelo site até o horário. Avisando com 2 horas de antecedência, outro cliente aproveita a vaga.",
      ),
    ).toBeVisible();
  });

  it("numera os passos pela própria lista, só com tipo, sem fotos", () => {
    render(<HowItWorks />);

    const section = screen.getByRole("region", { name: "Como funciona" });
    // O numeral é o contador da `ol` (classe `steps`), não um rótulo à parte.
    expect(within(section).getByRole("list").tagName).toBe("OL");
    expect(within(section).getByRole("list")).toHaveClass("steps");
    expect(within(section).queryByRole("img")).toBeNull();
  });
});
