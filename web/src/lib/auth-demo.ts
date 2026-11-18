import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { DEMO_ACCOUNTS, type DemoRole, isDemoLoginEnabled } from "./demo-mode";

/**
 * Entrada numa conta fictícia fixa (#199, ADR 0011). O endpoint é só do
 * servidor: não existe em `/api/auth/*`, e só a Server Action `signInAsDemo`
 * o chama. Não há senha nem cadastro aberto; com a flag desligada, ele
 * recusa com 404 mesmo se chamado.
 */
function demoSignIn(role: DemoRole) {
  return createAuthEndpoint.serverOnly({ method: "POST" }, async (ctx) => {
    if (!isDemoLoginEnabled()) throw new APIError("NOT_FOUND");
    const { email, name } = DEMO_ACCOUNTS[role];
    const adapter = ctx.context.internalAdapter;
    const found = await adapter.findUserByEmail(email);
    const user =
      found?.user ??
      (await adapter.createUser(
        { email, name, emailVerified: true },
        { method: "demo" },
      ));
    const session = await adapter.createSession(user.id);
    // A mesma sessão do login com Google: o cookie e o JWT da API (ADR 0003).
    await setSessionCookie(ctx, { session, user });
    return ctx.json({ ok: true });
  });
}

/** Plugin do modo demonstração. Os imports são relativos por causa da CLI. */
export function demoLogin() {
  return {
    id: "demo-login",
    endpoints: {
      signInDemoAdmin: demoSignIn("admin"),
      signInDemoCustomer: demoSignIn("customer"),
    },
  } satisfies BetterAuthPlugin;
}
