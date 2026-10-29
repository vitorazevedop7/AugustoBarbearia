import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Alert } from "./alert";
import { StatusBadge } from "./badge";
import { Button } from "./button";
import { ChoiceChip } from "./choice-chip";
import { TextField } from "./field";

describe("Button", () => {
  it("trava e marca como ocupado enquanto a ação está pendente", () => {
    render(<Button pending>Confirmando</Button>);
    const button = screen.getByRole("button", { name: "Confirmando" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveAttribute("type", "button");
  });
});

describe("TextField", () => {
  it("liga rótulo, dica e erro ao campo", () => {
    render(
      <TextField
        name="phone"
        label="Celular"
        hint="Com DDD."
        error="Informe um celular com DDD."
      />,
    );
    const input = screen.getByLabelText("Celular");
    expect(input).toBeRequired();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(
      "Com DDD. Informe um celular com DDD.",
    );
  });

  it("marca só o campo opcional", () => {
    render(<TextField name="note" label="Observação" optional />);
    expect(screen.getByLabelText("Observação (opcional)")).not.toBeRequired();
  });
});

describe("ChoiceChip", () => {
  it("é um radio com o horário como nome acessível", () => {
    render(<ChoiceChip name="time" value="14:30" label="14:30" />);
    expect(screen.getByRole("radio", { name: "14:30" })).toHaveAttribute(
      "value",
      "14:30",
    );
  });
});

describe("StatusBadge", () => {
  it("mostra o status em português", () => {
    render(<StatusBadge status="NO_SHOW" />);
    expect(screen.getByText("Faltou")).toBeInTheDocument();
  });
});

describe("Alert", () => {
  it("anuncia erros na hora e os demais avisos com calma", () => {
    render(
      <>
        <Alert tone="danger" title="Esse horário acabou de ser reservado." />
        <Alert title="Seu horário está confirmado." />
      </>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Esse horário acabou de ser reservado.",
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Seu horário está confirmado.",
    );
  });
});
