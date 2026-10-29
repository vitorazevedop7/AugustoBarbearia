// @vitest-environment node
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { testUtils } from "better-auth/plugins";
import { createLocalJWKSet, decodeProtectedHeader, jwtVerify } from "jose";
import { describe, expect, it } from "vitest";
import { apiJwt, issueApiToken } from "./auth-jwt";

const issuer = "http://localhost:3000";
const audience = "augusto-api";

/** Instância de teste: mesmo plugin JWT do site, banco em memória e helpers de sessão. */
function createTestAuth() {
  return betterAuth({
    baseURL: issuer,
    secret: "segredo-de-teste-com-pelo-menos-32-caracteres",
    database: memoryAdapter({
      user: [],
      session: [],
      account: [],
      verification: [],
      jwks: [],
    }),
    plugins: [apiJwt({ issuer, audience }), testUtils()],
  });
}

describe("JWT para a API (ADR 0003)", () => {
  it("emite um EdDSA de 15 minutos só com sub, email e name", async () => {
    const auth = createTestAuth();
    const { test } = await auth.$context;
    const user = await test.saveUser(
      test.createUser({ email: "carlos@exemplo.com", name: "Carlos Souza" }),
    );
    const headers = await test.getAuthHeaders({ userId: user.id });

    const token = await issueApiToken(auth, headers);
    expect(token).toEqual(expect.any(String));

    const jwks = createLocalJWKSet(await auth.api.getJwks());
    const { payload } = await jwtVerify(token!, jwks, { issuer, audience });
    expect(decodeProtectedHeader(token!).alg).toBe("EdDSA");
    expect(payload).toMatchObject({
      sub: user.id,
      email: "carlos@exemplo.com",
      name: "Carlos Souza",
    });
    expect(Object.keys(payload).sort()).toEqual(
      ["aud", "email", "exp", "iat", "iss", "name", "sub"].sort(),
    );
    expect(payload.exp! - payload.iat!).toBe(15 * 60);
  });

  it("devolve null quando não há sessão", async () => {
    const auth = createTestAuth();
    expect(await issueApiToken(auth, new Headers())).toBeNull();
  });
});
