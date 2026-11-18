import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEMO_ACCOUNTS,
  DEMO_LOGIN_ACKNOWLEDGEMENT,
  demoLoginStatus,
  parseDemoRole,
} from "./demo-mode";

describe("trava do modo demonstração (#199, ADR 0011)", () => {
  it("fica desligado por padrão", () => {
    expect(demoLoginStatus({})).toEqual({ enabled: false, error: null });
    expect(demoLoginStatus({ NODE_ENV: "development" })).toEqual({
      enabled: false,
      error: null,
    });
  });

  it.each(["false", "1", "yes", "", "verdadeiro"])(
    "só liga com true (não com %j)",
    (value) => {
      expect(
        demoLoginStatus({ NODE_ENV: "development", DEMO_LOGIN_ENABLED: value }),
      ).toEqual({ enabled: false, error: null });
    },
  );

  it("liga no desenvolvimento e nos testes só com a flag", () => {
    for (const NODE_ENV of ["development", "test", undefined]) {
      expect(demoLoginStatus({ NODE_ENV, DEMO_LOGIN_ENABLED: "true" })).toEqual(
        { enabled: true },
      );
    }
    expect(
      demoLoginStatus({
        NODE_ENV: "development",
        DEMO_LOGIN_ENABLED: " TRUE ",
      }),
    ).toEqual({ enabled: true });
  });

  it("na produção, ignora a flag sem a confirmação e explica o erro", () => {
    for (const DEMO_LOGIN_ACKNOWLEDGE of [undefined, "", "sim", "public"]) {
      const status = demoLoginStatus({
        NODE_ENV: "production",
        DEMO_LOGIN_ENABLED: "true",
        DEMO_LOGIN_ACKNOWLEDGE,
      });
      expect(status.enabled).toBe(false);
      expect(status).toMatchObject({
        error: expect.stringContaining("DEMO_LOGIN_ACKNOWLEDGE=public-demo"),
      });
    }
  });

  it("na produção, liga com a flag e a confirmação do compose da demonstração", () => {
    expect(DEMO_LOGIN_ACKNOWLEDGEMENT).toBe("public-demo");
    expect(
      demoLoginStatus({
        NODE_ENV: "production",
        DEMO_LOGIN_ENABLED: "true",
        DEMO_LOGIN_ACKNOWLEDGE: "public-demo",
      }),
    ).toEqual({ enabled: true });
  });

  it("na produção, a confirmação sozinha não liga nada", () => {
    expect(
      demoLoginStatus({
        NODE_ENV: "production",
        DEMO_LOGIN_ACKNOWLEDGE: "public-demo",
      }),
    ).toEqual({ enabled: false, error: null });
  });
});

describe("isDemoLoginEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("lê o ambiente e registra o erro de configuração uma vez só", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEMO_LOGIN_ENABLED", "true");
    vi.stubEnv("DEMO_LOGIN_ACKNOWLEDGE", "");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { isDemoLoginEnabled } = await import("./demo-mode");

    expect(isDemoLoginEnabled()).toBe(false);
    expect(isDemoLoginEnabled()).toBe(false);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it("não registra nada quando está só desligado", async () => {
    vi.stubEnv("DEMO_LOGIN_ENABLED", "");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { isDemoLoginEnabled } = await import("./demo-mode");

    expect(isDemoLoginEnabled()).toBe(false);
    expect(error).not.toHaveBeenCalled();
  });
});

describe("contas e papéis", () => {
  it("aceita só os dois papéis", () => {
    expect(parseDemoRole("admin")).toBe("admin");
    expect(parseDemoRole("customer")).toBe("customer");
    for (const value of ["Admin", "cliente", "", null, undefined, 1]) {
      expect(parseDemoRole(value)).toBeNull();
    }
  });

  it("usa e-mails fixos num domínio que não recebe mensagem", () => {
    expect(DEMO_ACCOUNTS.admin.email).toBe("admin@demo.augustobarbearia.local");
    expect(DEMO_ACCOUNTS.customer.email).toBe(
      "cliente@demo.augustobarbearia.local",
    );
    expect(DEMO_ACCOUNTS.admin.home).toBe("/admin");
    expect(DEMO_ACCOUNTS.customer.home).toBe("/meus-agendamentos");
  });
});
