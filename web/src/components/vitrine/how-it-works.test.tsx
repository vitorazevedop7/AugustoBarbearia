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
        "Cancele ou remarque pelo site até 2 horas antes do horário.",
      ),
    ).toBeVisible();
  });

  it("inclui as duas fotos descritivas com carga lazy e espaço reservado", () => {
    const { container } = render(<HowItWorks />);

    const chair = screen.getByAltText("Cliente na cadeira durante o corte");
    const phone = screen.getByAltText("Cliente com o celular na barbearia");
    for (const photo of [chair, phone]) {
      expect(photo).toHaveAttribute("loading", "lazy");
      expect(photo.parentElement).toHaveClass("aspect-[7/8]");
    }
    expect(phone.parentElement?.parentElement).toHaveClass(
      "hidden",
      "md:block",
      "border-8",
      "border-surface",
    );
    expect(container.querySelector("section")).toHaveClass("overflow-hidden");
  });
});
