import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CustomerForm } from "./customer-form";

vi.mock("./actions", () => ({
  createCustomer: vi.fn(),
  updateCustomer: vi.fn(),
}));

describe("CustomerForm — RN-20, RN-62, RN-23", () => {
  it("cadastra com nome e telefone obrigatórios e e-mail opcional", () => {
    render(<CustomerForm />);

    expect(screen.getByLabelText("Nome")).toBeRequired();
    expect(screen.getByLabelText("Telefone")).toBeRequired();
    expect(screen.getByLabelText("Telefone")).toHaveAttribute("type", "tel");
    expect(screen.getByLabelText("E-mail (opcional)")).not.toBeRequired();
    expect(screen.getByLabelText("E-mail (opcional)")).not.toHaveAttribute(
      "readonly",
    );
    expect(
      screen.getByRole("button", { name: "Salvar cliente" }),
    ).toHaveAttribute("type", "submit");
    expect(
      screen.getByRole("link", { name: "Voltar para a lista" }),
    ).toHaveAttribute("href", "/admin/clientes");
  });

  it("edita com o telefone formatado", () => {
    render(
      <CustomerForm
        customer={{
          id: 2,
          name: "Ana",
          phone: "75999990000",
          email: "ana@example.com",
          has_account: false,
        }}
      />,
    );

    expect(screen.getByLabelText("Nome")).toHaveValue("Ana");
    expect(screen.getByLabelText("Telefone")).toHaveValue("(75) 99999-0000");
    expect(screen.getByLabelText("E-mail (opcional)")).toHaveValue(
      "ana@example.com",
    );
  });

  it("trava o e-mail de quem tem conta Google e explica por quê", () => {
    render(
      <CustomerForm
        customer={{
          id: 2,
          name: "Ana",
          phone: null,
          email: "ana@example.com",
          has_account: true,
        }}
      />,
    );

    const email = screen.getByLabelText("E-mail");
    expect(email).toHaveAttribute("readonly");
    expect(email).toHaveValue("ana@example.com");
    expect(
      screen.getByText(/Vem da conta Google do cliente/),
    ).toBeInTheDocument();
    // Quem veio do Google sem telefone pode ser editado sem informá-lo.
    expect(screen.getByLabelText("Telefone (opcional)")).not.toBeRequired();
    expect(screen.getByLabelText("Telefone (opcional)")).toHaveValue("");
  });
});
