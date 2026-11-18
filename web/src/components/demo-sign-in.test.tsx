import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DemoBanner } from "./demo-banner";
import { DemoSignIn } from "./demo-sign-in";

vi.mock("@/lib/auth-actions", () => ({ signInAsDemo: vi.fn() }));
vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));

describe("DemoSignIn (#199)", () => {
  it("mostra os dois botões, cada um num formulário com o papel e a volta", () => {
    render(<DemoSignIn destination="/agendar?barbeiro=1" />);

    const admin = screen.getByRole("button", {
      name: "Entrar como administração (demo)",
    });
    const customer = screen.getByRole("button", {
      name: "Entrar como cliente (demo)",
    });
    for (const [button, role] of [
      [admin, "admin"],
      [customer, "customer"],
    ] as const) {
      expect(button).toHaveAttribute("type", "submit");
      const form = button.closest("form")!;
      const data = new FormData(form);
      expect(data.get("perfil")).toBe(role);
      expect(data.get("voltar")).toBe("/agendar?barbeiro=1");
    }
  });
});

describe("DemoBanner (#199)", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("avisa que é demonstração com a flag ligada", async () => {
    vi.stubEnv("DEMO_LOGIN_ENABLED", "true");

    render(await DemoBanner());

    expect(
      screen.getByText("Ambiente de demonstração — dados fictícios"),
    ).toBeInTheDocument();
  });

  it("não aparece com a flag desligada", async () => {
    vi.stubEnv("DEMO_LOGIN_ENABLED", "");

    expect(await DemoBanner()).toBeNull();
  });
});
