import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Alert } from "./alert";
import { StatusBadge } from "./badge";
import { BarberCard } from "./barber-card";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { ChoiceChip } from "./choice-chip";
import { TextAreaField, TextField } from "./field";
import { FloatingOrnament } from "./floating-ornament";
import { ServiceCard, ServiceItem } from "./service-card";

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
  it("é um card branco único com os serviços em grade", () => {
    render(
      <ServiceCard>
        <ul>
          <li>
            <ServiceItem
              name="Corte Simples"
              description={null}
              price="25.00"
              durationMinutes={30}
              barbers={[]}
              href="/agendar?servico=1"
            />
          </li>
          <li>
            <ServiceItem
              name="Barba"
              description={null}
              price="20.00"
              durationMinutes={30}
              barbers={[]}
              href="/agendar?servico=3"
            />
          </li>
        </ul>
      </ServiceCard>,
    );
    const card = screen.getByRole("list").parentElement!;
    expect(card).toHaveClass("bg-surface", "shadow-card");
    expect(screen.getAllByRole("article")).toHaveLength(2);
    // Sem quem realiza, a linha "Com" não aparece.
    expect(card).not.toHaveTextContent("Com");
  });
});

describe("ServiceItem", () => {
  it("mostra preço, duração e quem realiza, com o link para agendar", () => {
    render(
      <ServiceItem
        name="Corte + Barba"
        description="Com toalha quente."
        price="35.00"
        durationMinutes={45}
        barbers={["Edvaldo", "Lauro"]}
        href="/agendar?servico=2"
      />,
    );
    const item = screen.getByRole("article");
    const heading = screen.getByRole("heading", {
      level: 3,
      name: "Corte + Barba",
    });
    expect(heading).toHaveClass("font-heading", "font-black", "uppercase");
    expect(item).toHaveTextContent("Preço: R$ 35,00");
    expect(item).toHaveTextContent("Duração: 45 min");
    expect(item).toHaveTextContent("Com toalha quente.");
    expect(item).toHaveTextContent("Com Edvaldo e Lauro");
    expect(
      screen.getByRole("link", { name: "Agendar Corte + Barba" }),
    ).toHaveAttribute("href", "/agendar?servico=2");
  });
});

describe("BarberCard", () => {
  it("põe o nome e a primeira linha da apresentação sobre a foto 6:7", () => {
    render(
      <BarberCard
        name="Lauro"
        photoPath="/images/barbeiros/lauro.jpg"
        bio={"Primeira linha.\nSegunda linha."}
        href="/agendar?barbeiro=2"
        sizes="100vw"
        headingLevel="h2"
      />,
    );
    const photo = screen.getByRole("img", { name: "Foto de Lauro" });
    expect(photo.parentElement).toHaveClass("aspect-[6/7]", "overflow-hidden");
    // Zoom de 1,1 no hover, dentro da moldura, sem movimento se pedido.
    expect(photo).toHaveClass(
      "group-hover:scale-110",
      "duration-300",
      "motion-reduce:group-hover:scale-100",
    );
    const heading = screen.getByRole("heading", { level: 2, name: "Lauro" });
    expect(heading).toHaveClass("text-surface");
    // O texto fica num bloco escuro (ink/80 a ink/90) sobre a foto: contraste AA.
    expect(heading.parentElement).toHaveClass("from-ink/90", "to-ink/80");
    expect(heading.parentElement).toHaveTextContent("Primeira linha.");
    expect(screen.queryByText(/Segunda linha/)).toBeNull();
    expect(
      screen.getByRole("link", { name: "Agendar com Lauro" }),
    ).toHaveAttribute("href", "/agendar?barbeiro=2");
  });

  it("com fullBio, mostra a apresentação inteira abaixo da foto", () => {
    render(
      <BarberCard
        name="Lauro"
        photoPath="/images/barbeiros/lauro.jpg"
        bio={"Primeira linha.\nSegunda linha."}
        href="/agendar?barbeiro=2"
        sizes="100vw"
        fullBio
      />,
    );
    const heading = screen.getByRole("heading", { level: 3, name: "Lauro" });
    expect(heading.parentElement).not.toHaveTextContent("Primeira linha.");
    expect(screen.getByText(/Segunda linha/)).toHaveTextContent(
      "Primeira linha. Segunda linha.",
    );
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

  it("cai na inicial quando a foto não carrega (#159)", () => {
    render(
      <BarberCard
        name="Lauro"
        photoPath="/images/barbeiros/naoexiste.jpg"
        bio={null}
        href="/agendar?barbeiro=2"
        sizes="100vw"
      />,
    );

    fireEvent.error(screen.getByRole("img", { name: "Foto de Lauro" }));

    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("L")).toHaveAttribute("aria-hidden", "true");
  });
});

describe("FloatingOrnament", () => {
  it.each(["razor", "scissors", "comb"] as const)(
    "%s é decorativo, atrás do conteúdo e entra com fade",
    (shape) => {
      const { container } = render(<FloatingOrnament shape={shape} />);
      const svg = container.querySelector("svg")!;
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(svg).toHaveAttribute("data-reveal", "fade");
      expect(svg).toHaveClass(
        "pointer-events-none",
        "absolute",
        "-z-10",
        "hidden",
        "lg:block",
      );
      // Leve: só traço, poucos bytes.
      expect(svg.outerHTML.length).toBeLessThan(2048);
    },
  );
});
