import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SignInPage from "./page";

vi.mock("@/lib/auth-actions", () => ({ signInWithGoogle: vi.fn() }));
vi.mock("@/lib/session", () => ({
  getCurrentSession: vi.fn().mockResolvedValue(null),
  safeRedirectPath: () => "/",
}));

describe("página de entrar", () => {
  it("leva à política de privacidade", async () => {
    render(
      await SignInPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(
      screen.getByRole("link", { name: "Política de privacidade" }),
    ).toHaveAttribute("href", "/privacidade");
  });
});
