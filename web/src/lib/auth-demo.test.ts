// @vitest-environment node
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { afterEach, describe, expect, it, vi } from "vitest";
import { demoLogin } from "./auth-demo";
import { DEMO_ACCOUNTS } from "./demo-mode";

const baseURL = "http://localhost:3000";

function createTestAuth() {
  const db = {
    user: [] as { email: string; name: string }[],
    session: [] as { userId: string }[],
    account: [],
    verification: [],
  };
  const auth = betterAuth({
    baseURL,
    secret: "segredo-de-teste-com-pelo-menos-32-caracteres",
    database: memoryAdapter(db),
    plugins: [demoLogin()],
  });
  return { auth, db };
}

describe("entrada de demonstração no Better Auth (#199, ADR 0011)", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("cria a conta fictícia uma vez e grava uma sessão comum", async () => {
    vi.stubEnv("DEMO_LOGIN_ENABLED", "true");
    const { auth, db } = createTestAuth();

    const first = await auth.api.signInDemoAdmin({
      headers: new Headers(),
      returnHeaders: true,
    });
    await auth.api.signInDemoAdmin({ headers: new Headers() });

    expect(first.headers.get("set-cookie")).toContain(
      "better-auth.session_token=",
    );
    expect(db.user).toEqual([
      expect.objectContaining({
        email: DEMO_ACCOUNTS.admin.email,
        name: DEMO_ACCOUNTS.admin.name,
        emailVerified: true,
      }),
    ]);
    expect(db.session).toHaveLength(2);

    const cookie = first.headers.get("set-cookie")!.split(";")[0];
    const session = await auth.api.getSession({
      headers: new Headers({ cookie }),
    });
    expect(session?.user.email).toBe(DEMO_ACCOUNTS.admin.email);
  });

  it("entra na conta de cliente pelo outro endpoint", async () => {
    vi.stubEnv("DEMO_LOGIN_ENABLED", "true");
    const { auth, db } = createTestAuth();

    await auth.api.signInDemoCustomer({ headers: new Headers() });

    expect(db.user.map((user) => user.email)).toEqual([
      DEMO_ACCOUNTS.customer.email,
    ]);
  });

  it("recusa com 404 quando a flag está desligada", async () => {
    vi.stubEnv("DEMO_LOGIN_ENABLED", "false");
    const { auth, db } = createTestAuth();

    await expect(
      auth.api.signInDemoAdmin({ headers: new Headers() }),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(db.user).toEqual([]);
  });

  it("não expõe os endpoints pelo HTTP", async () => {
    vi.stubEnv("DEMO_LOGIN_ENABLED", "true");
    const { auth, db } = createTestAuth();
    const { endpoints } = demoLogin();

    for (const endpoint of Object.values(endpoints)) {
      // O `serverOnly` acrescenta o metadata, que o tipo das opções não mostra.
      const { metadata } = endpoint.options as {
        metadata?: { SERVER_ONLY?: boolean };
      };
      expect(metadata?.SERVER_ONLY).toBe(true);
    }
    for (const path of [
      "/api/auth/sign-in-demo-admin",
      "/api/auth/sign-in-demo-customer",
      "/api/auth/demo/sign-in",
      "/api/auth/sign-in/email",
      "/api/auth/sign-up/email",
    ]) {
      const response = await auth.handler(
        new Request(`${baseURL}${path}`, {
          method: "POST",
          headers: { "content-type": "application/json", origin: baseURL },
          body: JSON.stringify({
            email: "intruso@exemplo.com",
            password: "senha-qualquer-123",
            name: "Intruso",
          }),
        }),
      );
      expect(response.status, path).toBeGreaterThanOrEqual(400);
      expect(response.headers.get("set-cookie"), path).toBeNull();
    }
    expect(db.user).toEqual([]);
  });
});
