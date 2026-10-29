import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BarberForm } from "./barber-form";

vi.mock("./actions", () => ({
  createBarber: vi.fn(),
  updateBarber: vi.fn(),
}));

describe("BarberForm — RN-60", () => {
  it("cadastra com campos vazios, sem a situação", () => {
    render(<BarberForm />);

    expect(screen.getByLabelText("Nome")).toHaveValue("");
    expect(screen.getByLabelText("Nome")).toBeRequired();
    expect(screen.getByLabelText("Nome")).toHaveAttribute("maxlength", "80");
    expect(screen.getByLabelText("Foto (opcional)")).toHaveValue("");
    expect(screen.getByLabelText("Foto (opcional)")).not.toBeRequired();
    expect(screen.getByLabelText("Apresentação (opcional)")).toHaveAttribute(
      "maxlength",
      "400",
    );
    expect(screen.getByLabelText("Apresentação (opcional)")).not.toBeRequired();
    expect(screen.queryByLabelText("Situação")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Salvar barbeiro" }),
    ).toHaveAttribute("type", "submit");
    expect(
      screen.getByRole("link", { name: "Voltar para a lista" }),
    ).toHaveAttribute("href", "/admin/cadastros/barbeiros");
  });

  it("edita com os dados salvos e a situação", () => {
    render(
      <BarberForm
        barber={{
          id: 2,
          name: "Lauro",
          photo_path: "/images/barbeiros/lauro.jpg",
          bio: "Degradê e barba.",
          active: false,
        }}
      />,
    );

    expect(screen.getByLabelText("Nome")).toHaveValue("Lauro");
    expect(screen.getByLabelText("Foto (opcional)")).toHaveValue(
      "/images/barbeiros/lauro.jpg",
    );
    expect(screen.getByLabelText("Apresentação (opcional)")).toHaveValue(
      "Degradê e barba.",
    );
    expect(screen.getByLabelText("Situação")).toHaveValue("inativo");
  });

  it("mostra vazios a foto e a apresentação ausentes", () => {
    render(
      <BarberForm
        barber={{
          id: 1,
          name: "Edvaldo",
          photo_path: null,
          bio: null,
          active: true,
        }}
      />,
    );

    expect(screen.getByLabelText("Foto (opcional)")).toHaveValue("");
    expect(screen.getByLabelText("Apresentação (opcional)")).toHaveValue("");
    expect(screen.getByLabelText("Situação")).toHaveValue("ativo");
  });
});
