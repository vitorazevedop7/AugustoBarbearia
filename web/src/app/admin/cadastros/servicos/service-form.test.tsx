import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ServiceForm } from "./service-form";

vi.mock("./actions", () => ({
  createService: vi.fn(),
  updateService: vi.fn(),
}));

const barbers = [
  { id: 1, name: "Edvaldo", photo_path: null, bio: null, active: true },
  { id: 2, name: "Lauro", photo_path: null, bio: null, active: true },
  { id: 4, name: "Caio", photo_path: null, bio: null, active: false },
];

describe("ServiceForm — RN-61", () => {
  it("cadastra com campos vazios, os barbeiros desmarcados e sem a situação", () => {
    render(<ServiceForm barbers={barbers} />);

    expect(screen.getByLabelText("Nome")).toHaveValue("");
    expect(screen.getByLabelText("Nome")).toBeRequired();
    expect(screen.getByLabelText("Nome")).toHaveAttribute("maxlength", "80");
    expect(screen.getByLabelText("Descrição (opcional)")).not.toBeRequired();
    expect(screen.getByLabelText("Descrição (opcional)")).toHaveAttribute(
      "maxlength",
      "400",
    );
    expect(screen.getByLabelText("Preço")).toHaveAttribute(
      "inputmode",
      "decimal",
    );
    expect(screen.getByLabelText("Preço")).toHaveAccessibleDescription(
      "Em reais, como 25,00.",
    );
    expect(screen.getByLabelText("Duração")).toHaveAttribute("type", "number");
    expect(screen.getByLabelText("Duração")).toHaveAttribute("step", "5");
    expect(screen.getByLabelText("Duração")).toHaveAttribute("min", "10");

    const group = screen.getByRole("group", { name: "Quem realiza" });
    expect(group).toHaveAccessibleDescription(/Escolha pelo menos um barbeiro/);
    const boxes = within(group).getAllByRole("checkbox");
    expect(boxes.map((box) => box.getAttribute("name"))).toEqual([
      "barbeiro-1",
      "barbeiro-2",
      "barbeiro-4",
    ]);
    for (const box of boxes) expect(box).not.toBeChecked();
    expect(
      within(group).getByRole("checkbox", { name: "Caio (inativo)" }),
    ).toBeInTheDocument();

    expect(screen.queryByLabelText("Situação")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Salvar serviço" }),
    ).toHaveAttribute("type", "submit");
    expect(
      screen.getByRole("link", { name: "Voltar para a lista" }),
    ).toHaveAttribute("href", "/admin/cadastros/servicos");
  });

  it("edita com os dados salvos, o preço com vírgula e os barbeiros marcados", () => {
    render(
      <ServiceForm
        barbers={barbers}
        service={{
          id: 7,
          name: "Corte + Barba",
          description: "Tesoura e navalha.",
          price: "35.00",
          duration_minutes: 45,
          active: false,
          barbers: [{ id: 2, name: "Lauro", active: true }],
        }}
      />,
    );

    expect(screen.getByLabelText("Nome")).toHaveValue("Corte + Barba");
    expect(screen.getByLabelText("Descrição (opcional)")).toHaveValue(
      "Tesoura e navalha.",
    );
    expect(screen.getByLabelText("Preço")).toHaveValue("35,00");
    expect(screen.getByLabelText("Duração")).toHaveValue(45);
    expect(screen.getByRole("checkbox", { name: "Edvaldo" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Lauro" })).toBeChecked();
    expect(screen.getByLabelText("Situação")).toHaveValue("inativo");
  });
});
