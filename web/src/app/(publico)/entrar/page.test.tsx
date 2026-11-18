import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SignInPage from "./page";

vi.mock("@/lib/auth-actions", () => ({
  signInWithGoogle: vi.fn(),
  signInAsDemo: vi.fn(),
}));
vi.mock("@/lib/session", () => ({
  getCurrentSession: vi.fn().mockResolvedValue(null),
  safeRedirectPath: () => "/",
}));

async function renderPage() {
  render(
    await SignInPage({
      params: Promise.resolve({}),
      searchParams: Promise.resolve({}),
    }),
  );
}

describe("página de entrar", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("leva à política de privacidade", async () => {
    await renderPage();

    expect(
      screen.getByRole("link", { name: "Política de privacidade" }),
    ).toHaveAttribute("href", "/privacidade");
  });

  it("oferece só o Google com o modo demonstração desligado", async () => {
    vi.stubEnv("DEMO_LOGIN_ENABLED", "");
    await renderPage();

    expect(
      screen.getByRole("button", { name: "Entrar com Google" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /\(demo\)/ })).toBeNull();
  });

  it("oferece as duas contas fictícias com o modo demonstração ligado (#199)", async () => {
    vi.stubEnv("DEMO_LOGIN_ENABLED", "true");
    await renderPage();

    expect(
      screen.getByRole("button", { name: "Entrar com Google" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Entrar como administração (demo)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Entrar como cliente (demo)" }),
    ).toBeInTheDocument();
  });
});
