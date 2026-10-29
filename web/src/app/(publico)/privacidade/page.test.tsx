import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PrivacyPolicyPage from "./page";

describe("política de privacidade — RN-72", () => {
  it("tem um título e as seções da spec, em ordem", () => {
    render(<PrivacyPolicyPage />);

    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "main-content");
    expect(
      within(main).getByRole("heading", {
        name: "Política de privacidade",
        level: 1,
      }),
    ).toBeVisible();
    expect(
      within(main)
        .getAllByRole("heading", { level: 2 })
        .map((h) => h.textContent),
    ).toEqual([
      "Em resumo",
      "Quais dados guardamos",
      "Para que usamos",
      "Entrar com o Google",
      "E-mails que você recebe",
      "Quem vê seus dados",
      "Como pedir a exclusão",
      "O que fica no histórico financeiro",
    ]);
  });

  it("explica os dados, o uso e a exclusão pelo contato da barbearia", () => {
    render(<PrivacyPolicyPage />);

    const section = (name: string) =>
      screen.getByRole("region", { name }).textContent;

    expect(section("Quais dados guardamos")).toContain(
      "Nome, e-mail e telefone.",
    );
    expect(section("Para que usamos")).toContain("Só para o seu atendimento");
    expect(section("Entrar com o Google")).toContain(
      "só o seu nome, o seu e-mail e a foto do perfil",
    );
    expect(section("E-mails que você recebe")).toContain(
      "um lembrete cerca de 24 horas antes",
    );
    expect(section("Como pedir a exclusão")).toContain(
      "pelo contato da barbearia",
    );
    expect(section("O que fica no histórico financeiro")).toContain(
      "sem o seu nome, e-mail ou telefone",
    );
  });

  it("rn16: diz que outros clientes não veem os seus dados", () => {
    render(<PrivacyPolicyPage />);

    expect(
      screen.getByRole("region", { name: "Quem vê seus dados" }),
    ).toHaveTextContent("Outros clientes não têm acesso a eles.");
  });
});
