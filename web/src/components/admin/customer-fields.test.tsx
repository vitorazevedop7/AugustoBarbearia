import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CustomerFields } from "./customer-fields";

const values = { name: "Ana", phone: "(75) 99999-0000", email: "a@b.com" };

describe("CustomerFields — RN-20, RN-62", () => {
  it("usa os nomes que o envio do formulário lê", () => {
    render(
      <form>
        <CustomerFields values={values} />
      </form>,
    );

    expect(screen.getByLabelText("Nome")).toHaveAttribute("name", "name");
    expect(screen.getByLabelText("Telefone")).toHaveAttribute("name", "phone");
    expect(screen.getByLabelText("E-mail (opcional)")).toHaveAttribute(
      "name",
      "email",
    );
    expect(screen.getByLabelText("Nome")).toHaveValue("Ana");
  });

  it("deixa o telefone opcional só quando pedido", () => {
    const { rerender } = render(<CustomerFields values={values} />);
    expect(screen.getByLabelText("Telefone")).toBeRequired();

    rerender(<CustomerFields values={values} phoneOptional />);
    expect(screen.getByLabelText("Telefone (opcional)")).not.toBeRequired();
  });
});
