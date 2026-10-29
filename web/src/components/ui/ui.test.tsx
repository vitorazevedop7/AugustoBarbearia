import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Alert } from "./alert";
import { StatusBadge } from "./badge";
import { BarberCard } from "./barber-card";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { ChoiceChip } from "./choice-chip";
import { TextAreaField, TextField } from "./field";
import { ServiceCard } from "./service-card";

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

describe("TextAreaField", () => {
  it("liga rótulo e dica ao campo de várias linhas", () => {
    render(
      <TextAreaField
        name="about"
        label="Sobre"
        hint="Até 1000 caracteres."
        optional
      />,
    );
    const textarea = screen.getByLabelText("Sobre (opcional)");
    expect(textarea.tagName).toBe("TEXTAREA");
    expect(textarea).not.toBeRequired();
    expect(textarea).toHaveAccessibleDescription("Até 1000 caracteres.");
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

describe("Checkbox", () => {
  it("é um checkbox nativo com o rótulo como nome acessível", () => {
    render(<Checkbox name="barbeiro-2" label="Lauro" defaultChecked />);
    const checkbox = screen.getByRole("checkbox", { name: "Lauro" });
    expect(checkbox).toBeChecked();
    expect(checkbox).toHaveAttribute("name", "barbeiro-2");
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

describe("ServiceCard", () => {
  it("mostra preço, duração e quem realiza, com o link para agendar", () => {
    render(
      <ServiceCard
        name="Corte + Barba"
        description="Com toalha quente."
        price="35.00"
        durationMinutes={45}
        barbers={["Edvaldo", "Lauro"]}
        href="/agendar?servico=2"
      />,
    );
    const card = screen.getByRole("article");
    expect(
      screen.getByRole("heading", { level: 3, name: "Corte + Barba" }),
    ).toBeVisible();
    expect(card).toHaveTextContent("Preço: R$ 35,00");
    expect(card).toHaveTextContent("Duração: 45 min");
    expect(card).toHaveTextContent("Com toalha quente.");
    expect(card).toHaveTextContent("Com Edvaldo e Lauro");
    expect(
      screen.getByRole("link", { name: "Agendar Corte + Barba" }),
    ).toHaveAttribute("href", "/agendar?servico=2");
  });
});

describe("BarberCard", () => {
  it("usa a foto 4:5 com texto alternativo", () => {
    render(
      <BarberCard
        name="Lauro"
        photoPath="/images/barbeiros/lauro.jpg"
        bio="Apresentação."
        href="/agendar?barbeiro=2"
        sizes="100vw"
        headingLevel="h2"
      />,
    );
    const photo = screen.getByRole("img", { name: "Foto de Lauro" });
    expect(photo.parentElement).toHaveClass("aspect-[4/5]", "overflow-hidden");
    expect(
      screen.getByRole("heading", { level: 2, name: "Lauro" }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Agendar com Lauro" }),
    ).toHaveAttribute("href", "/agendar?barbeiro=2");
  });

  it("mostra a inicial, sem imagem, quando não há foto", () => {
    render(
      <BarberCard
        name=" manoel"
        photoPath={null}
        bio={null}
        href="/agendar?barbeiro=3"
        sizes="100vw"
      />,
    );
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("M")).toHaveAttribute("aria-hidden", "true");
  });
});
