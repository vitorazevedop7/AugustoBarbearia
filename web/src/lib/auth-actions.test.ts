import { notFound, redirect } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/lib/auth";
import { signInAsDemo } from "./auth-actions";

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      signInDemoAdmin: vi.fn(),
      signInDemoCustomer: vi.fn(),
      signInSocial: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("signInAsDemo (#199)", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllEnvs());

  it("responde 404 com a flag desligada, sem criar sessão", async () => {
    vi.stubEnv("DEMO_LOGIN_ENABLED", "false");

    await expect(
      signInAsDemo(form({ perfil: "admin", voltar: "/" })),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
    expect(auth.api.signInDemoAdmin).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("responde 404 na produção sem a confirmação", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEMO_LOGIN_ENABLED", "true");
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(signInAsDemo(form({ perfil: "admin" }))).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(auth.api.signInDemoAdmin).not.toHaveBeenCalled();
  });

  it("responde 404 para um papel desconhecido", async () => {
    vi.stubEnv("DEMO_LOGIN_ENABLED", "true");

    await expect(signInAsDemo(form({ perfil: "dono" }))).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(auth.api.signInDemoAdmin).not.toHaveBeenCalled();
    expect(auth.api.signInDemoCustomer).not.toHaveBeenCalled();
  });

  it("entra como administração e abre /admin", async () => {
    vi.stubEnv("DEMO_LOGIN_ENABLED", "true");

    await signInAsDemo(form({ perfil: "admin", voltar: "/" }));

    expect(auth.api.signInDemoAdmin).toHaveBeenCalledTimes(1);
    expect(auth.api.signInDemoCustomer).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/admin");
  });

  it("entra como cliente e abre /meus-agendamentos", async () => {
    vi.stubEnv("DEMO_LOGIN_ENABLED", "true");

    await signInAsDemo(form({ perfil: "customer" }));

    expect(auth.api.signInDemoCustomer).toHaveBeenCalledTimes(1);
    expect(redirect).toHaveBeenCalledWith("/meus-agendamentos");
  });

  it("volta para a página que pediu o login, nunca para outro site", async () => {
    vi.stubEnv("DEMO_LOGIN_ENABLED", "true");

    await signInAsDemo(
      form({ perfil: "customer", voltar: "/agendar?barbeiro=1" }),
    );
    expect(redirect).toHaveBeenLastCalledWith("/agendar?barbeiro=1");

    await signInAsDemo(form({ perfil: "customer", voltar: "//exemplo.com" }));
    expect(redirect).toHaveBeenLastCalledWith("/meus-agendamentos");
  });
});
